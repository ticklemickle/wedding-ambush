import admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { runVisionOcrFromGcs } from "./vision.js";
import { parseOcrTextToOutput } from "./parser.js";

admin.initializeApp();
const db = admin.firestore();

const LEASE_MS = 60 * 1000; // 1분
const nowMs = () => Date.now();

async function acquireLease(jobRef, owner, storagePath) {
  const leaseUntil = nowMs() + LEASE_MS;

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(jobRef);
    const data = snap.exists ? snap.data() : null;

    // 멱등성: 이미 끝난 작업은 스킵
    if (data?.status === "DONE" || data?.status === "FAILED") {
      return { ok: false, reason: "ALREADY_FINISHED" };
    }

    // 락(lease) 이미 잡혀 있으면 스킵
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

function parseUploadPath(filePath) {
  try {
    const [, date, fileName] = String(filePath).split("/");
    const rawId = String(fileName).split("_")[0];
    const jobId = `${date}_${rawId}`;
    return { date, jobId };
  } catch {
    return null;
  }
}

/* ------------------------------ trigger ------------------------------ */
export const ocrOnUpload = onObjectFinalized(
  {
    region: "us-east1",
    memory: "1GiB",
    timeoutSeconds: 180,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name || "";
    const contentType = object.contentType || "";

    // uploads/ 아래 이미지에만 반응
    if (!filePath.startsWith("uploads/")) return;
    if (!contentType.startsWith("image/")) return;

    const parsedPath = parseUploadPath(filePath);
    if (!parsedPath) return;

    const { date, jobId } = parsedPath;

    const jobRef = db
      .collection("ocrJobs")
      .doc(date)
      .collection("jobs")
      .doc(jobId);

    const owner = `fn-${process.env.GCLOUD_PROJECT || "proj"}-${
      process.env.FUNCTION_TARGET || "ocrOnUpload"
    }`;

    const lease = await acquireLease(jobRef, owner, filePath);
    if (!lease.ok) return;

    try {
      // OCR_RUNNING
      await jobRef.set(
        {
          jobId,
          status: "OCR_RUNNING",
          storagePath: filePath,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // 1) Vision OCR (text + words)
      const ocr = await runVisionOcrFromGcs(object.bucket, filePath);
      const ocrText = ocr?.text || "";
      const ocrWords = ocr?.words || [];

      // OCR 결과 저장 + 파싱 단계로 전환
      await jobRef.set(
        {
          status: "PARSING",
          ocrText,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (!ocrText || typeof ocrText !== "string") {
        throw new Error("Empty OCR text");
      }

      // 2) Parse (NO LLM)
      const parsedOutput = parseOcrTextToOutput(ocrText, new Date(), ocrWords);

      // DONE
      await jobRef.set(
        {
          status: "DONE",
          parsed: parsedOutput,
          parseError: admin.firestore.FieldValue.delete(),
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
          parseError: {
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
