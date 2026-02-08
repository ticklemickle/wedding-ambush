/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require("firebase-admin");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { defineSecret } = require("firebase-functions/params");
const vision = require("@google-cloud/vision");

admin.initializeApp();
const db = admin.firestore();

const visionClient = new vision.ImageAnnotatorClient();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

const LEASE_MS = 1 * 60 * 1000; // 1분

function nowMs() {
  return Date.now();
}

function parseUploadPath(filePath) {
  const [, date, fileName] = filePath.split("/");
  const rawId = fileName.split("_")[0];
  const jobId = `${date}_${rawId}`;

  return { date, jobId };
}

async function acquireLease(jobRef, owner, storagePath) {
  const leaseUntil = nowMs() + LEASE_MS;

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    const data = snap.exists ? snap.data() : null;

    // 멱등성: 이미 완료면 종료
    if (data?.status === "DONE" || data?.status === "FAILED") {
      return { ok: false, reason: "ALREADY_FINISHED" };
    }

    // 락 확인
    const currentUntil = data?.lease?.until || 0;
    if (currentUntil > nowMs()) {
      return { ok: false, reason: "LEASE_HELD" };
    }

    tx.set(
      jobRef,
      {
        status: data?.status || "OCR_RUNNING",
        storagePath: data?.storagePath || storagePath,
        createdAt:
          data?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lease: { owner, until: leaseUntil },
      },
      { merge: true },
    );

    return { ok: true, leaseUntil };
  });
}

async function releaseLease(jobRef, owner) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    const data = snap.exists ? snap.data() : null;
    if (data?.lease?.owner !== owner) return;

    tx.set(
      jobRef,
      { lease: admin.firestore.FieldValue.delete() },
      { merge: true },
    );
  });
}

async function runVisionOcrFromGcs(bucketName, filePath) {
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(filePath);
  const [buffer] = await file.download();

  const [result] = await visionClient.documentTextDetection({
    image: { content: buffer },
  });

  const text =
    result.fullTextAnnotation?.text ||
    result.textAnnotations?.[0]?.description ||
    "";

  return { text };
}

function compressOcrForLLM(rawText) {
  const keepKeyword =
    /(아트홀|그랜드볼룸|연회장|뷔페|토요일|일요일|예식시간|총견적|대관료|식대|대인|소인|석)/;

  const keepNumber = /(\d{1,2}:\d{2})|(\d{1,3},\d{3})|(원)|(명)|(\d+\|\d+)/;

  return rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/[※*].*$/, "").replace(/\s+/g, " "))
    .filter((l) => keepNumber.test(l) || keepKeyword.test(l))
    .slice(0, 160)
    .join("\n");
}

function buildPrompt(ocrText) {
  return `
You are a parser, not an analyst.
The input is noisy OCR text from a wedding venue price list / estimate sheet in Korean + English.

Rules:
Venue
- Extract venue name and normalize to Korean
- If unclear, set value to "unidentify"

Selection
- One price set per date/time only
- If multiple values exist for the same field, choose the final or emphasized one

Output
- Multiple estimates are allowed
- Return ALL valid estimates as a JSON array
- No explanation text, JSON only (IMPORTANT)

Validation
- Values must fall within defined ranges
- Out-of-range values → null

Ranges:
accuracy(a) 0~1
date YYYY-MM-DD
day Sat|Sun
time 10:00~20:00
rental 0~20,000,000
meal 50,000~200,000
guests 50~500
total_cost 10,000,000~100,000,000

Output format:
{
  "overall": {"a": null},
  "venue": { "v": "", "a": null },
  "estimates": [
    {
      "date": { "v": null, "a": null },
      "day": { "v": null, "a": null },
      "time": { "v": null, "a": null },
      "rental": { "v": null, "a": null },
      "meal": { "v": null, "a": null },
      "guests": { "v": null, "a": null },
      "total_cost": { "v": null, "a": null }
    }
  ]
}

OCR TEXT:
<<<
${ocrText}
>>>
`;
}

async function runGeminiFast(apiKey, rawOcrText, model) {
  const { GoogleGenAI } = require("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const compressed = compressOcrForLLM(rawOcrText);
  const prompt = buildPrompt(compressed);

  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
    },
  });

  return res.text || "[]";
}

exports.ocrOnUpload = onObjectFinalized(
  {
    region: "us-east1",
    memory: "1GiB",
    timeoutSeconds: 120,
    secrets: [GEMINI_API_KEY],
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name || "";
    const contentType = object.contentType || "";

    // uploads/ 아래 이미지에만 반응
    if (!filePath.startsWith("uploads/")) return;
    if (!contentType.startsWith("image/")) return;

    const parsed = parseUploadPath(filePath);
    if (!parsed) return;

    const { date, jobId } = parsed;

    // ✅ 클라이언트가 구독하는 컬렉션에 맞추세요
    const jobRef = db.collection("ocrJobs").doc(jobId);

    const owner = `fn-${process.env.GCLOUD_PROJECT || "proj"}-${process.env.FUNCTION_TARGET || "ocrOnUpload"}`;

    const lease = await acquireLease(jobRef, owner, filePath);
    if (!lease.ok) return;

    try {
      // OCR_RUNNING
      await jobRef.set(
        {
          jobId,
          date,
          status: "OCR_RUNNING",
          storagePath: filePath,
          contentType,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Vision OCR
      const ocr = await runVisionOcrFromGcs(object.bucket, filePath);

      // LLM_RUNNING
      await jobRef.set(
        {
          status: "LLM_RUNNING",
          ocrText: ocr.text,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // ✅ Gemini
      const apiKey = GEMINI_API_KEY.value();
      const model = DEFAULT_GEMINI_MODEL;

      const aiJson = await runGeminiFast(apiKey, ocr.text, model);
      // DONE
      await jobRef.set(
        {
          status: "DONE",
          resultSummary: aiJson,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("Analyze Error:", e);
      await jobRef.set(
        {
          status: "FAILED",
          error: {
            message: String(e?.message || e),
            name: e?.name || null,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } finally {
      await releaseLease(jobRef, owner);
    }
  },
);
