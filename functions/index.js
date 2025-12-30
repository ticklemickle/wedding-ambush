/* eslint-disable @typescript-eslint/no-require-imports */

const admin = require("firebase-admin");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const vision = require("@google-cloud/vision");

admin.initializeApp();
const db = admin.firestore();
const client = new vision.ImageAnnotatorClient();

exports.ocrOnUpload = onObjectFinalized(
  {
    region: "us-east1",
    // bucket: "wedding-ambush.appspot.com",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name || "";
    const contentType = object.contentType || "";

    if (!filePath.startsWith("uploads/")) return;
    if (!contentType.startsWith("image/")) return;

    const jobId = filePath.split("/")[1];
    const gcsUri = `gs://${object.bucket}/${filePath}`;

    try {
      const [result] = await client.documentTextDetection(gcsUri);
      const text = result.fullTextAnnotation?.text || "";

      await db.collection("ocrJobs").doc(jobId).set({
        text,
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
