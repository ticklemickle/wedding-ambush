import admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import vision from "@google-cloud/vision";

admin.initializeApp();
const db = admin.firestore();
const visionClient = new vision.ImageAnnotatorClient();

const KST_TZ = "Asia/Seoul";

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

/* ------------------------------ utils ------------------------------ */
const normalize = (s = "") => String(s).replace(/\s+/g, " ").trim();

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toStr(v) {
  return v == null ? "" : String(v);
}

function parseKRWAny(text) {
  if (!text) return null;
  const s = String(text)
    .replace(/[,\s.]/g, "")
    .replace(/[^\d]/g, "");
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** 2026년 1월 17일 */
function parseFullDate(line) {
  const m = String(line).match(
    /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/,
  );
  if (!m) return null;
  return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
}

/**
 * 7/4, 7/4(토), 6/28(일) ...
 * - 연도는 “올해/내년 중 하나”
 * - 기준시점(nowKST) 기준으로 “±12개월 이내”이면서, 가능하면 “미래에 더 가까운 날짜”로 선택
 */
function inferYearForMonthDay(month, day, now = new Date()) {
  // now를 KST 기준 날짜로 취급하기 위해 YYYY-MM-DD를 KST로 뽑아 다시 Date로 구성
  const nowKstYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // e.g. 2026-02-16
  const [ny, nm, nd] = nowKstYmd.split("-").map((x) => parseInt(x, 10));
  const base = new Date(Date.UTC(ny, nm - 1, nd)); // "KST의 오늘 00:00"을 UTC로 고정

  const candidates = [ny, ny + 1].map((y) => {
    const d = new Date(Date.UTC(y, month - 1, day));
    return { y, d };
  });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const within12mo = (d) =>
    Math.abs(d.getTime() - base.getTime()) <= 366 * DAY_MS;

  // 1) 12개월 이내 후보만
  const c = candidates.filter((x) => within12mo(x.d));
  if (!c.length) {
    // 그래도 반드시 올해/내년 중 하나는 골라야 하면, “미래에 더 가까운 쪽” 우선
    const future = candidates.filter((x) => x.d.getTime() >= base.getTime());
    if (future.length) {
      future.sort((a, b) => a.d - b.d);
      return future[0].y;
    }
    candidates.sort((a, b) => Math.abs(a.d - base) - Math.abs(b.d - base));
    return candidates[0].y;
  }

  // 2) 미래(>=base) 우선, 그 중 가장 가까운 것
  const future = c.filter((x) => x.d.getTime() >= base.getTime());
  if (future.length) {
    future.sort((a, b) => a.d - b.d);
    return future[0].y;
  }

  // 3) 전부 과거면 가장 가까운 것
  c.sort((a, b) => Math.abs(a.d - base) - Math.abs(b.d - base));
  return c[0].y;
}

function parseShortDatesAll(line, now = new Date()) {
  const s = String(line);
  const re = /(^|[^\d])(\d{1,2})\s*\/\s*(\d{1,2})(?=[^\d]|$)/g;
  const out = [];
  let m;
  while ((m = re.exec(s))) {
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
    const yy = inferYearForMonthDay(mm, dd, now);
    out.push(`${yy}-${pad2(mm)}-${pad2(dd)}`);
  }
  return out;
}

/** (월|화|...|일) or "토요일" */
function parseKRDay(line) {
  const m = String(line).match(
    /(월|화|수|목|금|토|일)\s*요일|\((월|화|수|목|금|토|일)\)/,
  );
  return m ? m[1] || m[2] : null;
}

function weekdayFromDateISO(isoYmd) {
  if (!isoYmd) return null;
  const [y, m, d] = isoYmd.split("-").map((x) => parseInt(x, 10));
  // KST 기준 날짜의 요일을 얻기 위해 UTC midnight로 만들고, formatter는 KST로
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wk = new Intl.DateTimeFormat("en-US", {
    timeZone: KST_TZ,
    weekday: "short",
  }).format(dt);
  // "Sat", "Sun", "Mon"...
  return wk;
}

function normalizeDayToSatSun(dayEng) {
  if (dayEng === "Sat" || dayEng === "Sun") return dayEng;
  return ""; // 요구 Range가 Sat|Sun이라면 기타 요일은 빈 값 처리
}

function parseTimeRange(line) {
  const s = String(line);

  // 11:00~12:30 / 11:00 - 12:30
  let m = s.match(
    /(\d{1,2})\s*:\s*(\d{2})\s*[~\-–—]\s*(\d{1,2})\s*:\s*(\d{2})/,
  );
  if (m) {
    const a = `${pad2(m[1])}:${m[2]}`;
    const b = `${pad2(m[3])}:${m[4]}`;
    return `${a}~${b}`;
  }

  // 단일 HH:MM
  m = s.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (m) return `${pad2(m[1])}:${m[2]}`;

  // "오전 11시 30분" / "오후 2시" / "오전 11시반"
  m = s.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/);
  if (m) {
    let h = parseInt(m[2], 10);
    const min = m[3] ? pad2(parseInt(m[3], 10)) : "00";
    if (m[1] === "오후" && h < 12) h += 12;
    if (m[1] === "오전" && h === 12) h = 0;
    return `${pad2(h)}:${min}`;
  }

  m = s.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*반/);
  if (m) {
    let h = parseInt(m[2], 10);
    if (m[1] === "오후" && h < 12) h += 12;
    if (m[1] === "오전" && h === 12) h = 0;
    return `${pad2(h)}:30`;
  }

  return "";
}

/* ------------------------------ extraction ------------------------------ */
function extractVenue(lines) {
  for (const l of lines.slice(0, 10)) {
    const m = l.match(/(.+?)\s*웨딩\s*견적서/);
    if (m) return m[1].trim();
  }
  return "";
}

function extractDocGuests(lines) {
  for (const l of lines) {
    if (/지불\s*보증\s*인원|보증\s*인원/.test(l)) {
      const m = l.match(/(\d{2,4})\s*명?/);
      if (m) return parseInt(m[1], 10);
    }
  }
  return null;
}

function extractDocMeal(lines) {
  for (const l of lines) {
    if (/식대|1인당|대인|뷔페|Buffet/i.test(l)) {
      const n = parseKRWAny(l);
      if (n && n >= 20000 && n <= 200000) return n;
    }
  }
  return null;
}

function extractDocRental(lines) {
  for (const l of lines) {
    if (/대관료|홀\s*사용료|웨딩홀\s*사용료|예식홀\s*대관료/.test(l)) {
      const n = parseKRWAny(l);
      if (n && n >= 300000) return n;
    }
  }
  return null;
}

function extractDocTotal(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (/총\s*(예상)?비용|총\s*견적|총\s*합계|합계|총\s*견적/.test(lines[i])) {
      for (let j = i; j < i + 6 && j < lines.length; j++) {
        const n = parseKRWAny(lines[j]);
        if (n && n >= 1_000_000) return n;
      }
    }
  }
  return null;
}

function isEstimateHeader(line) {
  const s =
    (/(예식\s*일자|행사\s*일자|일자|일정)/.test(line) ? 1 : 0) +
    (/(시간|예식\s*시간)/.test(line) ? 1 : 0) +
    (/(보증\s*인원|인원)/.test(line) ? 1 : 0) +
    (/(식대|대인|뷔페|1인당|식사)/.test(line) ? 1 : 0) +
    (/(총\s*(예상)?비용|총\s*견적|합계|예상비용)/.test(line) ? 1 : 0);
  return s >= 3;
}

function parseEstimateMerged(merged, now = new Date()) {
  const fullDate = parseFullDate(merged);
  const shortDates = parseShortDatesAll(merged, now);
  const date = fullDate || shortDates[0] || "";

  // day: 텍스트에 있으면 우선, 없거나 깨졌으면 date로 계산
  const dayKr = parseKRDay(merged);
  let dayEng = "";
  if (dayKr === "토") dayEng = "Sat";
  else if (dayKr === "일") dayEng = "Sun";
  else if (date) dayEng = weekdayFromDateISO(date) || "";

  dayEng = normalizeDayToSatSun(dayEng);

  const time = parseTimeRange(merged);

  let guests = "";
  const gm = merged.match(/(\d{2,4})\s*명/);
  if (gm) guests = String(parseInt(gm[1], 10));

  let meal = "";
  if (/식대|1인당|대인|뷔페|Buffet|식사/i.test(merged)) {
    const n = parseKRWAny(merged);
    if (n && n >= 20000 && n <= 200000) meal = String(n);
  }

  let total_cost = "";
  if (/총\s*(예상)?비용|총\s*견적|합계|예상비용/.test(merged)) {
    const n = parseKRWAny(merged);
    if (n && n >= 1_000_000) total_cost = String(n);
  }

  return { date, day: dayEng, time, rental: "", meal, guests, total_cost };
}

function uniqByDateTime(estimates) {
  const seen = new Set();
  const out = [];
  for (const e of estimates) {
    const k = `${e.date}__${e.time}`;
    if (k === "__") continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function extractEstimates(lines, now = new Date()) {
  // 1) 표 헤더 탐지 후 아래 구간 스캔
  for (let i = 0; i < lines.length; i++) {
    if (isEstimateHeader(lines[i])) {
      const out = [];
      for (let k = i + 1; k < Math.min(lines.length, i + 60); k++) {
        const l = lines[k];
        if (/비고|참고|유의\s*사항|약관|문의/.test(l)) break;

        const hasDate =
          !!parseFullDate(l) || parseShortDatesAll(l, now).length > 0;
        const hasTime = !!parseTimeRange(l);
        if (!hasDate && !hasTime) continue;

        const merged = [l, lines[k + 1] || "", lines[k + 2] || ""].join(" | ");
        const e = parseEstimateMerged(merged, now);
        if (e.date || e.time) out.push(e);
      }
      if (out.length) return uniqByDateTime(out);
      break;
    }
  }

  // 2) 앵커(날짜/시간) 중심 클러스터
  const anchors = [];
  for (let i = 0; i < lines.length; i++) {
    if (
      parseFullDate(lines[i]) ||
      parseShortDatesAll(lines[i], now).length > 0 ||
      parseTimeRange(lines[i])
    ) {
      anchors.push(i);
    }
  }

  const out = [];
  for (const idx of anchors.slice(0, 40)) {
    const start = Math.max(0, idx - 3);
    const end = Math.min(lines.length - 1, idx + 3);
    const merged = lines.slice(start, end + 1).join(" | ");
    const e = parseEstimateMerged(merged, now);
    if (e.date || e.time) out.push(e);
  }

  if (out.length) return uniqByDateTime(out);

  // 3) fallback 1개
  return [
    {
      date: "",
      day: "",
      time: "",
      rental: "",
      meal: "",
      guests: "",
      total_cost: "",
    },
  ];
}

/* ------------------------------ pure parser ------------------------------ */
function parseOcrTextToOutput(ocrText, now = new Date()) {
  const lines = String(ocrText || "")
    .split("\n")
    .map(normalize)
    .filter(Boolean);

  const venue = extractVenue(lines);

  const docGuests = extractDocGuests(lines);
  const docMeal = extractDocMeal(lines);
  const docRental = extractDocRental(lines);
  const docTotal = extractDocTotal(lines);

  const estimates = extractEstimates(lines, now).map((e) => ({
    date: e.date || "",
    day:
      e.day ||
      (e.date ? normalizeDayToSatSun(weekdayFromDateISO(e.date) || "") : ""),
    time: e.time || "",
    rental: e.rental || toStr(docRental),
    meal: e.meal || toStr(docMeal),
    guests: e.guests || toStr(docGuests),
    total_cost: e.total_cost || toStr(docTotal),
  }));

  return {
    venue: { v: venue },
    estimates,
  };
}

/* ------------------------------ Storage Trigger (Gen2) ------------------------------ */
/**
 * uploads/yyyymmdd/yyyymmdd_filename.jpg
 * - jobId: {date}_{rawId}  (rawId = filename의 '_' 앞부분)
 * - writes: ocrJobs/{jobId}.ocrText + 상태/메타
 */
function parseUploadPath(filePath) {
  try {
    const parts = String(filePath || "").split("/");
    // uploads/{date}/{fileName}
    if (parts.length < 3) return null;
    const [root, date, fileName] = parts;
    if (root !== "uploads") return null;

    const rawId = String(fileName || "").split("_")[0] || "";
    if (!date || !rawId) return null;

    const jobId = `${date}_${rawId}`;
    return { date, jobId };
  } catch {
    return null;
  }
}

async function runVisionOcrFromGcs(bucketName, filePath) {
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

  return { text };
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

    const parsedPath = parseUploadPath(filePath); // { date, jobId }
    if (!parsedPath) return;

    const { date, jobId } = parsedPath;

    // ✅ 새 구조: ocrJobs/{yyyymmdd}/{hhmmss}/{JobId}
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

      // 1) Vision OCR
      const ocr = await runVisionOcrFromGcs(object.bucket, filePath);
      const ocrText = ocr?.text || "";

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

      // 2) Parse
      const parsedOutput = parseOcrTextToOutput(ocrText, new Date());

      // ✅ 파싱 성공 시에만 DONE
      await jobRef.set(
        {
          status: "DONE",
          parsed: parsedOutput, // ✅ ".parsedOutput" 버그 수정
          parseError: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("OCR+Parse Error:", e);

      await jobRef.set(
        {
          status: "FAILED",
          error: {
            message: String(e?.message || e),
            name: e?.name || null,
          },
          parseError: {
            message: String(e?.message || e),
            at: admin.firestore.FieldValue.serverTimestamp(),
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
