import { venues } from "./venues.js";

const KST_TZ = "Asia/Seoul";

/* ------------------------------ utils ------------------------------ */

function normalize(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
  const mdays = [
    31,
    isLeapYear(y) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return mdays[m - 1] ?? 0;
}

function isValidYMD(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d))
    return false;
  if (m < 1 || m > 12) return false;
  const dim = daysInMonth(y, m);
  if (d < 1 || d > dim) return false;
  return true;
}

function toStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  return s;
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

/* ------------------------------ venue ------------------------------ */

// 공백 제거(모든 whitespace 제거)
const compact = (s) => String(s ?? "").replace(/\s+/g, "");

// venues Set을 "공백 제거 버전" -> "원본 venue명"으로 인덱싱
const buildVenueIndex = (venuesSet) => {
  const m = new Map();
  for (const v of venuesSet) m.set(compact(v), v);
  return m;
};

function extractVenue(lines) {
  const head = lines.slice(0, 10);
  const tail = lines.slice(Math.max(0, lines.length - 10));
  const scope = [...head, ...tail].map((l) => String(l ?? "")).filter(Boolean);

  // venues는 import된 Set이라고 가정
  const venueIndex = buildVenueIndex(venues);

  // 부분 매칭을 위해 key들을 길이 내림차순으로 준비 (긴 이름 우선)
  const venueKeysDesc = [...venueIndex.keys()].sort(
    (a, b) => b.length - a.length,
  );

  const findVenue = (text) => {
    const c = compact(text);

    // 1) 완전 일치(기존 로직)
    const exact = venueIndex.get(c);
    if (exact) return exact;

    // 2) 부분(포함) 매칭: "더컨벤션신사웨딩견적서" 안에서 "더컨벤션신사" 찾기
    for (const key of venueKeysDesc) {
      if (c.includes(key)) return venueIndex.get(key);
    }

    return null;
  };

  // 1) 단일 라인 매칭(완전 일치 + 부분 매칭)
  for (const l of scope) {
    const hit = findVenue(l);
    if (hit) return hit;
  }

  // 2) 연속 라인 합치기(2줄, 3줄) 매칭: OCR 줄바꿈 분절 대응
  for (let i = 0; i < scope.length; i++) {
    const twoText = (scope[i] ?? "") + (scope[i + 1] ?? "");
    const threeText =
      (scope[i] ?? "") + (scope[i + 1] ?? "") + (scope[i + 2] ?? "");

    const hit2 = findVenue(twoText);
    if (hit2) return hit2;

    const hit3 = findVenue(threeText);
    if (hit3) return hit3;
  }

  return null;
}

/* ------------------------------ time/day/date helpers ------------------------------ */

function weekdayFromDateISO(iso) {
  // iso: YYYY-MM-DD
  try {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) return null;
    // KST 기준으로 날짜 계산
    const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    // Intl로 KST 요일
    const wd = new Intl.DateTimeFormat("ko-KR", {
      timeZone: KST_TZ,
      weekday: "short",
    }).format(dt);
    // "토", "일", "월"...
    return wd;
  } catch {
    return null;
  }
}

function normalizeDayToSatSun(day) {
  if (!day) return "";
  if (/토/.test(day)) return "Sat";
  if (/일/.test(day)) return "Sun";
  return "";
}

function isTimeInRange(hhmm) {
  const m = String(hhmm).match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23) return false;
  if (min < 0 || min > 59) return false;
  const total = h * 60 + min;
  return total >= 10 * 60 && total <= 20 * 60;
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
    // 10:00~20:00 범위 체크(시작/끝 모두)
    if (!isTimeInRange(a) || !isTimeInRange(b)) return "";
    return `${a}~${b}`;
  }

  // 단일 HH:MM
  m = s.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (m) {
    const t = `${pad2(m[1])}:${m[2]}`;
    return isTimeInRange(t) ? t : "";
  }

  // "오전 11시 30분" / "오후 2시" / "오전 11시반"
  m = s.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/);
  if (m) {
    let h = parseInt(m[2], 10);
    const min = m[3] ? pad2(parseInt(m[3], 10)) : "00";
    if (m[1] === "오후" && h < 12) h += 12;
    if (m[1] === "오전" && h === 12) h = 0;
    const t = `${pad2(h)}:${min}`;
    return isTimeInRange(t) ? t : "";
  }

  m = s.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*반/);
  if (m) {
    let h = parseInt(m[2], 10);
    if (m[1] === "오후" && h < 12) h += 12;
    if (m[1] === "오전" && h === 12) h = 0;
    const t = `${pad2(h)}:30`;
    return isTimeInRange(t) ? t : "";
  }

  return "";
}

/* ------------------------------ guests/meal/rental/total (text rules) ------------------------------ */

function splitIntoDateBlocks(lines, now = new Date()) {
  const blocks = [];
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const iso = parseDateFromLine(l, now);

    if (iso) {
      // 새 block 시작
      if (cur) blocks.push(cur);
      cur = { headerLine: l, date: iso, lines: [l] };
    } else if (cur) {
      cur.lines.push(l);
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

function extractDayFromBlock(blockLines, dateISO) {
  for (const l of blockLines) {
    if (/(^|[\s(])토(요일)?($|[\s)])/u.test(l)) return "Sat";
    if (/(^|[\s(])일(요일)?($|[\s)])/u.test(l)) return "Sun";
  }
  // fallback: 날짜로 계산 후 토/일만 유지
  const wd = weekdayFromDateISO(dateISO); // "토", "일", ...
  return normalizeDayToSatSun(wd || "");
}

function extractTimeFromBlock(blockLines) {
  for (const l of blockLines) {
    const t = parseTimeRange(l);
    if (t) return t;
  }
  return "";
}

function extractGuestsFromBlock(blockLines) {
  // 1) "N명" 최우선
  for (const l of blockLines) {
    const m = l.match(/(\d{2,4})\s*명/u);
    if (m) {
      const g = parseInt(m[1], 10);
      if (g >= 50 && g <= 500) return String(g);
    }
  }

  // 2) 단독 숫자(금액 문맥 제거): 50~500
  for (const l of blockLines) {
    // 금액처럼 보이는 라인은 스킵(원, ₩, 콤마+3자리 등)
    if (/[₩원]/u.test(l)) continue;
    if (/\d{1,3}(?:,\d{3})+/.test(l)) continue;

    const m = l.match(/\b(\d{2,4})\b/u);
    if (m) {
      const g = parseInt(m[1], 10);
      if (g >= 50 && g <= 500) return String(g);
    }
  }

  return "";
}

function extractMealFromBlock(blockLines) {
  // 날짜 라인 바로 근처에서 먼저 찾기(표 형태에서 효과 좋음)
  const near = blockLines.slice(0, 6);
  for (const l of near) {
    const n = pickFirstNumberInRange(l, 50_000, 200_000);
    if (n != null) return String(n);
  }
  for (const l of blockLines) {
    const n = pickFirstNumberInRange(l, 50_000, 200_000);
    if (n != null) return String(n);
  }
  return "";
}

function extractRentalFromBlock(blockLines) {
  // 키워드 라인 우선
  for (const l of blockLines) {
    if (/(예식비|대관료|홀\s*사용료|사용료|대여료)/u.test(l)) {
      const n = pickFirstNumberInRange(l, 1_000_000, 20_000_000);
      if (n != null) return String(n);
    }
  }
  // fallback: block 내 범위값 중 첫 값(표에서는 보통 예식비가 단독 라인으로 옴)
  for (const l of blockLines) {
    const n = pickFirstNumberInRange(l, 1_000_000, 20_000_000);
    if (n != null) return String(n);
  }
  return "";
}

function extractTotalFromBlock(blockLines) {
  // 키워드 라인 우선
  for (const l of blockLines) {
    if (/(예상\s*비용|총|합계|TOTAL)/i.test(l)) {
      const n = pickFirstNumberInRange(l, 10_000_000, 100_000_000);
      if (n != null) return String(n);
    }
  }
  // fallback: block 내 10M~100M 후보 중 "가장 큰 값" 선택
  const cands = [];
  for (const l of blockLines) {
    const matches = String(l).match(/\d{1,3}(?:,\d{3})+|\d{7,9}/g) || [];
    for (const x of matches) {
      const n = parseKRWAny(x);
      if (n != null && n >= 10_000_000 && n <= 100_000_000) cands.push(n);
    }
  }
  if (!cands.length) return "";
  return String(Math.max(...cands));
}

function extractEstimatesByDateBlocks(lines, now = new Date()) {
  const blocks = splitIntoDateBlocks(lines, now);
  const out = [];

  for (const b of blocks) {
    const day = extractDayFromBlock(b.lines, b.date);
    const time = extractTimeFromBlock(b.lines);
    const meal = extractMealFromBlock(b.lines);
    const guests = extractGuestsFromBlock(b.lines);
    const rental = extractRentalFromBlock(b.lines);
    const total_cost = extractTotalFromBlock(b.lines);

    out.push({
      date: b.date || "",
      day: day || "",
      time: time || "",
      meal: meal || "",
      guests: guests || "",
      rental: rental || "",
      total_cost: total_cost || "",
    });
  }

  // 날짜 block마다 데이터가 있다고 가정하므로 out을 그대로 반환
  return out;
}

function extractDocGuests(lines) {
  // guests 후보로 인정하기 싫은 문맥들
  const MONEY_CTX =
    /[₩원]|\bKRW\b|만원|천원|백만원|식대|금액|비용|대관료|예식비|합계|총|TOTAL/i;

  // 시간/간격 문맥 (요청: (90분 간격) 같은 케이스는 무조건 스킵)
  const TIME_CTX = /분|시간|minute|mins?|hours?|hr|간격/i;

  // guests로 강하게 의심되는 키워드
  const GUEST_KEYWORDS = /보증\s*인원|보증인원|인원|하객|게스트|guests?/i;

  // 숫자 토큰 추출: 콤마 포함 금액(69,000)에서 69/000 쪼개지는 문제를 피하려고
  // "순수 숫자 덩어리"만 잡되, 앞뒤가 숫자/콤마가 아닌 경우로 제한
  const NUM_TOKEN = /(?<![\d,])(\d{2,4})(?![\d,])/g;

  let best = null; // { value, score, lineIndex }

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (!raw) continue;

    // 0) 괄호 안에 시간/간격이 있는 라인은 강제 스킵: "(90분 간격)" 같은 케이스
    //    라인 전체가 괄호든, 일부에 괄호가 포함되든 모두 방지
    if (/\(\s*\d{1,4}\s*(?:분|시간)[^)]*\)/u.test(raw)) continue;

    // 1) 금액 문맥이면 guests 후보로 보기 어려움 → 스킵
    //    (단, "250명 식대..." 같은 혼합 라인이 있을 수 있어, "명"이 있으면 스킵하지 않음)
    const hasMONEY = MONEY_CTX.test(raw);
    const hasPersonUnit = /(\d{2,4})\s*명/u.test(raw);
    if (hasMONEY && !hasPersonUnit) continue;

    // 2) 우선순위 1: "명"이 붙은 숫자 (가장 강함)
    //    단, "90분" 같은 시간 단위는 제외 (명 우선이지만 단위가 분이면 guests 아님)
    {
      const m = raw.match(/(?<![\d,])(\d{2,4})\s*명(?![\w])/u);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n >= 50 && n <= 500) {
          // 점수: 명 + 키워드면 매우 강함
          let score = 100;
          if (GUEST_KEYWORDS.test(raw)) score += 30;
          // 괄호 안 "명" 같은 경우는 드물지만 혹시 있으면 약간 감점
          if (/\([^)]*명[^)]*\)/u.test(raw)) score -= 10;

          if (!best || score > best.score)
            best = { value: n, score, lineIndex: idx };
          // "명"은 강하므로 같은 라인에서 더 찾지 않아도 됨
          continue;
        }
      }
    }

    // 3) 우선순위 2: 키워드가 있는 라인에서 50~500 숫자 찾기
    //    "보증인원 250" 같은 경우 대응
    const hasGuestKeyword = GUEST_KEYWORDS.test(raw);

    // 시간 문맥이 강하면(분/시간/간격) 숫자 후보를 기본적으로 제외
    // (단, guests 키워드가 있고 시간 표현이 같이 있을 가능성은 낮아서 과감히 제외하는 편이 정확도에 유리)
    if (TIME_CTX.test(raw) && !hasGuestKeyword) continue;

    let match;
    while ((match = NUM_TOKEN.exec(raw)) !== null) {
      const n = parseInt(match[1], 10);
      if (n < 50 || n > 500) continue;

      // 숫자 바로 뒤가 "분/시간"이면 무조건 스킵 (예: "90분")
      const after = raw.slice(
        match.index + match[1].length,
        match.index + match[1].length + 4,
      );
      if (/^\s*(분|시간)/u.test(after)) continue;

      // 숫자 주변(앞뒤 6자)에 시간/간격이 있으면 스킵 (예: "(90분 간격)" 같이 일부만 걸릴 때)
      const start = Math.max(0, match.index - 6);
      const end = Math.min(raw.length, match.index + match[1].length + 6);
      const around = raw.slice(start, end);
      if (TIME_CTX.test(around)) continue;

      // 점수 계산
      let score = 0;

      // 키워드가 있으면 매우 가산
      if (hasGuestKeyword) score += 60;

      // "인원" 같은 키워드 근처에 숫자가 붙어있으면 추가 가산
      // (OCR에서 "보증인원250"처럼 붙는 경우)
      if (/보증\s*인원|보증인원|인원|하객/i.test(around)) score += 25;

      // 숫자가 문장 초반(요약 영역)에 나오면 약간 가산 (경험상 표의 핵심값이 앞에 나올 때 많음)
      if (match.index <= 12) score += 5;

      // 금액 문맥이 (명 없이) 남아있을 수 있으므로 감점
      if (hasMONEY) score -= 20;

      if (!best || score > best.score)
        best = { value: n, score, lineIndex: idx };
    }

    // NUM_TOKEN.exec 사용했으므로 reset
    NUM_TOKEN.lastIndex = 0;
  }

  return best ? best.value : null;
}

function extractDocMeal(lines) {
  // 50,000 ~ 200,000 사이 값이면 모두 "식대"로 판단
  // 연속된 값이 나오는 경우(예: "70,000~80,000원", "70000-80000") 작은 값 선택
  for (const l of lines) {
    // 1) "범위/연속" 패턴 먼저 처리: a~b, a-b, a~ b, a - b
    //    (콤마 포함/미포함 모두)
    let m = l.match(
      /(\d{1,3}(?:,\d{3})+|\d{5,6})\s*(?:~|-)\s*(\d{1,3}(?:,\d{3})+|\d{5,6})\s*원?/u,
    );
    if (m) {
      const a = parseKRWAny(m[1]);
      const b = parseKRWAny(m[2]);
      if (a != null && b != null) {
        const small = Math.min(a, b);
        if (small >= 50_000 && small <= 200_000) return small;
      }
      // 범위 패턴이 있더라도 범위 밖이면 다음 라인 계속
      continue;
    }

    // 2) 일반 숫자(여러 개 있을 수 있음) 모두 스캔해서 첫 유효값 반환
    const matches = l.match(/\d{1,3}(?:,\d{3})+|\d{5,6}/g);
    if (!matches) continue;

    for (const x of matches) {
      const n = parseKRWAny(x);
      if (n != null && n >= 50_000 && n <= 200_000) return n;
    }
  }

  return null;
}

function extractDocRental(lines) {
  // 대관료: 0~20,000,000
  for (const l of lines) {
    if (/(대관료|홀사용료|대여료)/.test(l)) {
      const mm = l.match(/(\d{1,3}(?:,\d{3})+|\d{6,8})\s*원?/);
      if (mm) {
        const n = parseKRWAny(mm[1]);
        if (n != null && n >= 0 && n <= 20_000_000) return n;
      }
    }
  }
  return null;
}

function extractDocTotal(lines) {
  // fallback: "총예상비용/합계" 라인에서 큰 금액 1개 추출
  for (const l of lines) {
    if (/(총\s*(예상)?비용|총\s*견적|합계|TOTAL)/i.test(l)) {
      const nums = (l.match(/\d{1,3}(?:,\d{3})+|\d{7,9}/g) || [])
        .map((x) => parseKRWAny(x))
        .filter((n) => n != null && n >= 10_000_000 && n <= 100_000_000);
      if (nums.length === 1) return nums[0];
      if (nums.length >= 2) return nums[nums.length - 1]; // 오른쪽/마지막 값 경향
    }
  }
  return null;
}

/* ------------------------------ layout-based promo total (NO LLM) ------------------------------ */

function groupWordsToLines(words) {
  if (!Array.isArray(words) || !words.length) return [];

  const heights = words
    .map((w) => Math.max(1, (w.y1 ?? 0) - (w.y0 ?? 0)))
    .sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] || 12;
  const yTol = Math.max(8, Math.round(medianH * 0.8));

  const sorted = [...words].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const lines = [];

  for (const w of sorted) {
    let placed = false;
    for (const ln of lines) {
      if (Math.abs(ln.cy - w.cy) <= yTol) {
        ln.items.push(w);
        ln.cy = (ln.cy * (ln.items.length - 1) + w.cy) / ln.items.length;
        placed = true;
        break;
      }
    }
    if (!placed) lines.push({ cy: w.cy, items: [w] });
  }

  return lines
    .map((ln) => {
      const items = ln.items.sort((a, b) => a.cx - b.cx);
      const text = items.map((x) => x.t).join(" ");
      return { cy: ln.cy, items, text };
    })
    .sort((a, b) => a.cy - b.cy);
}

const RE_BASE = /(기본|정상)/;
const RE_PROMO = /(프로모션|할인|혜택)/;
const RE_TOTAL = /(총\s*(예상)?비용|총\s*견적|총\s*합계|합계|TOTAL)/i;

function pickBestPromoTotalFromHeader(lines, headerIdx) {
  const header = lines[headerIdx];
  const baseXs = header.items.filter((w) => RE_BASE.test(w.t)).map((w) => w.cx);
  const promoXs = header.items
    .filter((w) => RE_PROMO.test(w.t))
    .map((w) => w.cx);
  if (!promoXs.length) return null;

  const promoX = promoXs.reduce((a, b) => a + b, 0) / promoXs.length;
  const baseX = baseXs.length
    ? baseXs.reduce((a, b) => a + b, 0) / baseXs.length
    : null;

  const splitX = baseX != null ? (promoX + baseX) / 2 : promoX - 30;

  const start = headerIdx + 1;
  const end = Math.min(lines.length, headerIdx + 45);

  const candidates = [];
  for (let i = start; i < end; i++) {
    const ln = lines[i];
    const isTotalLine = RE_TOTAL.test(ln.text);

    for (const w of ln.items) {
      if (w.cx < splitX) continue; // 오른쪽 컬럼만
      const n = parseKRWAny(w.t);
      if (n == null) continue;
      if (n < 10_000_000 || n > 100_000_000) continue; // total_cost 범위
      candidates.push({
        n,
        score: (isTotalLine ? 8 : 0) + Math.min(3, n / 10_000_000),
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].n;
}

function extractPromoTotalFromLayout(words) {
  const lines = groupWordsToLines(words);

  // 1) "기본/정상" + "프로모션/할인" 헤더 기반
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text;
    if (RE_PROMO.test(t) && RE_BASE.test(t)) {
      const v = pickBestPromoTotalFromHeader(lines, i);
      if (v != null) return v;
    }
  }

  // 2) fallback: "총예상비용/합계" 라인에서 가장 오른쪽 금액
  for (const ln of lines) {
    if (!RE_TOTAL.test(ln.text)) continue;

    const nums = ln.items
      .map((w) => ({ n: parseKRWAny(w.t), x: w.cx }))
      .filter((x) => x.n != null && x.n >= 10_000_000 && x.n <= 100_000_000);

    if (nums.length >= 2) {
      nums.sort((a, b) => a.x - b.x);
      return nums[nums.length - 1].n;
    }
  }

  return null;
}

/* ------------------------------ helpers: numeric pickers ------------------------------ */

function pickFirstNumberInRange(line, min, max) {
  const matches = String(line).match(/\d{1,3}(?:,\d{3})+|\d{4,9}/g);
  if (!matches) return null;
  for (const x of matches) {
    const n = parseKRWAny(x);
    if (n != null && n >= min && n <= max) return n;
  }
  return null;
}

function parseDateFromLine(line, now) {
  // extractEstimates()의 date 파트만 “함수화”한 버전 (동일 규칙)
  const l = String(line);
  const nowY = now.getFullYear();
  const minY = nowY - 3;
  const maxY = nowY + 3;

  let m;

  // (A) "2026년 2월 28일"
  m = l.match(/\b(?:(20\d{2})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일\b/u);
  if (m) {
    let y = m[1] ? parseInt(m[1], 10) : nowY;
    y = Math.min(maxY, Math.max(minY, y));
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);
    if (isValidYMD(y, mm, dd)) return `${y}-${pad2(mm)}-${pad2(dd)}`;
    return "";
  }

  // (B) "2026-02-18" / "2026.02.18"
  m = l.match(/\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/u);
  if (m) {
    let y = parseInt(m[1], 10);
    y = Math.min(maxY, Math.max(minY, y));
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);
    if (isValidYMD(y, mm, dd)) return `${y}-${pad2(mm)}-${pad2(dd)}`;
    return "";
  }

  // 👉 추가: 나이 범위 차단
  if (
    /\b\d{1,2}\s*-\s*\d{1,2}\s*세\b/u.test(l) ||
    /(소인|어린이|아동)/u.test(l)
  ) {
    return "";
  }

  // (C) "7/4", "02-18" (연도 없음)
  m = l.match(/\b(\d{1,2})[.\-/](\d{1,2})\b/u);
  if (m) {
    const y = Math.min(maxY, Math.max(minY, nowY));
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    if (isValidYMD(y, mm, dd)) return `${y}-${pad2(mm)}-${pad2(dd)}`;
    return "";
  }

  return "";
}

/* ------------------------------ multi-line total/meal improvements ------------------------------ */

function extractDocTotalMultiLine(lines) {
  // "총예상비용/총견적/합계" 라인을 만나면 다음 N줄에서 큰 금액들 모아서
  // 프로모션(대체로 더 작은 값) 우선: 후보가 2개 이상이면 min, 1개면 그 값
  const N = 12;
  for (let i = 0; i < lines.length; i++) {
    if (!/(총\s*(예상)?비용|총\s*견적|합계|TOTAL)/i.test(lines[i])) continue;

    const cands = [];
    for (let j = i; j < Math.min(lines.length, i + N); j++) {
      const nums = (lines[j].match(/\d{1,3}(?:,\d{3})+|\d{7,9}/g) || [])
        .map((x) => parseKRWAny(x))
        .filter((n) => n != null && n >= 10_000_000 && n <= 100_000_000);
      cands.push(...nums);
    }
    if (cands.length >= 2) return Math.min(...cands);
    if (cands.length === 1) return cands[0];
  }
  return null;
}

function extractDocMealPreferPromo(lines) {
  // "기본/정상" + "프로모션/할인" 헤더 근처에서 50k~200k 후보를 모아 “더 작은 값(프로모션)” 우선
  const N = 25;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    if (!/(기본|정상)/.test(t) || !/(프로모션|할인|혜택)/.test(t)) continue;

    const cands = [];
    for (let j = i; j < Math.min(lines.length, i + N); j++) {
      const n = pickFirstNumberInRange(lines[j], 50_000, 200_000);
      if (n != null) cands.push(n);
    }
    if (cands.length) return Math.min(...cands);
  }

  // fallback: 기존 방식(첫 유효값)
  return extractDocMeal(lines);
}

/* ------------------------------ pure parser ------------------------------ */

export function parseOcrTextToOutput(ocrText, now = new Date(), words = null) {
  const lines = String(ocrText || "")
    .split("\n")
    .map(normalize)
    .filter(Boolean);

  const venue = extractVenue(lines);

  // 문서 전역 fallback들은 유지해도 되고(안전), block에 항상 값이 있다면 제거해도 됩니다.
  const docGuests = extractDocGuests(lines);
  const docMeal = extractDocMealPreferPromo(lines);
  const docRental = extractDocRental(lines);

  const promoTotal =
    words && Array.isArray(words) && words.length
      ? extractPromoTotalFromLayout(words)
      : null;

  const docTotal =
    promoTotal ?? extractDocTotalMultiLine(lines) ?? extractDocTotal(lines);

  const blockEstimates = extractEstimatesByDateBlocks(lines, now);

  const base = blockEstimates.map((e) => ({
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
    estimates: base,
  };
}
