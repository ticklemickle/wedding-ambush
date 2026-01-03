/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require("firebase-admin");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const OpenAI = require("openai");
const { getStorage } = require("firebase-admin/storage");

admin.initializeApp();
const db = admin.firestore();
const storage = getStorage();

exports.ocrOnUpload = onObjectFinalized(
  {
    region: "us-east1",
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: ["OPENAI_API_KEY"],
  },
  async (event) => {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const object = event.data;
    const filePath = object.name || "";
    const contentType = object.contentType || "";

    if (!filePath.startsWith("uploads/")) return;
    if (!contentType.startsWith("image/")) return;

    const jobId = filePath.split("/")[1];

    try {
      // 1) Storage에서 파일 다운로드
      const bucket = storage.bucket(object.bucket);
      const file = bucket.file(filePath);
      const [buffer] = await file.download();

      // 2) base64로 변환
      const base64 = buffer.toString("base64");

      // 2) GPT Vision 호출
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
You analyze Korean wedding estimate images.
If the image is not a wedding estimate, return
{"result": "NOT_WEDDING_ESTIMATE"}


Rules:
Priority
- Offered prices override printed prices
- handwritten > highlighted > printed(digital)

Venue
- Extract venue name and normalize to Korean
- If unclear, set value to "unidentify"

Selection
- The image may contain multiple dates, times, or estimates
- One price set per date/time only
- If multiple values exist for the same field, choose the final or emphasized one
- If no offered price exists, set value to null

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

Extract JSON:

{
  "overall": {"a": },
  "venue": { "v": "", "a": },
  "estimates": [
    {
      "date": { "v": "", "a":  },
      "day": { "v": "", "a":  },
      "time": { "v": "", "a":  },
      "rental": { "v": 0, "a": },
      "meal": { "v": 0, "a": },
      "guests": { "v": 0, "a": },
      "total_cost": { "v": 0, "a": }
    }
  ]
}
                `.trim(),
              },
              {
                type: "input_image",
                image_url: `data:${contentType};base64,${base64}`,
              },
            ],
          },
        ],
      });

      const output = response.output_text;

      // 3) Firestore 저장
      await db.collection("ocrJobs").doc(jobId).set({
        result: output,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        contentType,
        filePath,
      });
    } catch (e) {
      await db
        .collection("ocrJobs")
        .doc(jobId)
        .set({
          error: String(e?.message || e),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          contentType,
          filePath,
        });
    }
  }
);
