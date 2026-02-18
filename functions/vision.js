import admin from "firebase-admin";
import vision from "@google-cloud/vision";

const visionClient = new vision.ImageAnnotatorClient();

function getWordText(word) {
  return (word?.symbols || []).map((s) => s.text || "").join("");
}

function getPoly(word) {
  const v = word?.boundingBox?.vertices || [];
  const xs = v.map((p) => p?.x ?? 0);
  const ys = v.map((p) => p?.y ?? 0);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function extractWordsFromVision(result) {
  const out = [];
  const pages = result?.fullTextAnnotation?.pages || [];
  for (const page of pages) {
    const blocks = page.blocks || [];
    for (const block of blocks) {
      const paras = block.paragraphs || [];
      for (const p of paras) {
        const words = p.words || [];
        for (const w of words) {
          const t = getWordText(w);
          if (!t) continue;
          const b = getPoly(w);
          out.push({ t, ...b });
        }
      }
    }
  }
  return out;
}

export async function runVisionOcrFromGcs(bucketName, filePath) {
  // ✅ 권한 이슈를 최소화하기 위해: Functions가 Storage에서 파일을 직접 다운로드 후 Vision에 bytes로 전달
  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(filePath);

  const [buffer] = await file.download();

  const [result] = await visionClient.documentTextDetection({
    image: { content: buffer },
  });

  const text =
    result?.fullTextAnnotation?.text ||
    result?.textAnnotations?.[0]?.description ||
    "";

  const words = extractWordsFromVision(result);

  return { text, words };
}
