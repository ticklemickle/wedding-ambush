import React from "react";
import { MealLineChart } from "../components/chart/MealLineChart";
import SummaryCard from "./components/SummaryCard";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string) {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function formatPercent(p: number, digits = 0) {
  return (p * 100).toFixed(digits);
}

function parseDate(dateStr?: string) {
  // 기대 형식: YYYY-MM-DD
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;

  // 유효성: 입력값과 실제 date가 같은지 검사 (ex: 2027-02-31 방지)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"] as const;
  const weekday = weekdays[dt.getDay()];

  return {
    y,
    m,
    d,
    weekday,
    label: `${m}월 ${String(d).padStart(2, "0")}일 ${weekday}요일`,
  };
}

function parseTime(timeStr?: string) {
  // 기대 형식: HH:MM
  if (!timeStr) return null;
  const [hh, mm] = timeStr.split(":").map((x) => Number(x));
  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  )
    return null;
  return `${String(hh).padStart(2, "0")}시 ${String(mm).padStart(2, "0")}분`;
}

function parseIntSafe(s?: string) {
  if (!s) return null;
  const n = Number(digitsOnly(s));
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseMealPriceWon(raw?: string) {
  // mealPrice=10%2C000 -> "10,000"
  const n = parseIntSafe(raw);
  if (n === null) return null;
  // 식대: 10,000 ~ 500,000
  if (n < 10000 || n > 500000) return null;
  return n;
}

function parseHallFeeWon(raw?: string) {
  const n = parseIntSafe(raw);
  if (n === null) return null;

  const won = n <= 10000 ? n * 10000 : n;
  if (won < 0 || won > 100000000) return null;
  return won;
}

function regionCode(code?: string) {
  const map: Record<string, string> = {
    a: "서울 강남",
    b: "서울 강북",
    c: "서울 강서",
  };
  return map[code ?? ""] ?? "SAMPLE";
}

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const regionStr = pick(sp, "region");
  const dateStr = pick(sp, "date");
  const timeStr = pick(sp, "time");
  const guaranteeStr = pick(sp, "guarantee");
  const mealPriceStr = pick(sp, "mealPrice");
  const hallFeeStr = pick(sp, "hallFee");

  // --- 파싱/기본값(샘플) ---
  const regionName = regionCode(regionStr);

  const date = parseDate(dateStr) ?? {
    y: 2026,
    m: 12,
    d: 31,
    weekday: "일",
    label: "99월 99일 일요일",
  };

  const time = parseTime(timeStr) ?? "99:99";

  const guarantee = parseIntSafe(guaranteeStr) ?? 0;

  const mealPriceWon = parseMealPriceWon(mealPriceStr) ?? 0;
  const hallFeeWon = parseHallFeeWon(hallFeeStr) ?? 0;

  // --- 샘플 계산(알 수 없는 값은 하드코딩) ---
  // 총 비용(샘플): 식대*보증 + 대관료 + 기타 옵션(샘플 2,400,000)
  const optionEtcWon = 0;
  const totalWon = mealPriceWon * guarantee + hallFeeWon + optionEtcWon;

  const rows = [
    { item: "포토테이블", avg: "서비스", maison: "서비스" },
    {
      item: "피아노 3중주",
      avg: "서비스",
      maison: <span className="text-gray-500">미제공</span>,
    },
    {
      item: "전문사회자",
      avg: "30만원",
      maison: (
        <div className="text-center">
          <p>35만원</p>
          <p className="text-[10px] font-350 text-red-500">
            평균보다 5만원 비쌈
          </p>
        </div>
      ),
    },
    {
      item: "혼구용품",
      avg: "20만원",
      maison: (
        <div className="text-center">
          <p>35만원</p>
          <p className="text-[10px] font-350 text-emerald-500">
            평균보다 5만원 비쌈
          </p>
        </div>
      ),
    },
  ];

  /* 평타 비율 */
  const percentile = 0.9;
  const variant =
    percentile <= 0.2
      ? "top20"
      : percentile <= 0.6
        ? "mid"
        : percentile <= 0.8
          ? "bottom20"
          : "bottom10";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 space-y-6 max-w-md mx-auto">
      {/* 1️⃣ 상단 요약 카드 */}
      <section>
        <SummaryCard
          regionName={regionName}
          dateLabel={date.label}
          time={time}
          variant={variant}
        />
      </section>

      {/* 2️⃣ 팩트 요약 */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="font-350 text-lg mb-1">👊 팩트 폭행 한 줄 요약</h2>
        <hr className="border-t border-gray-200 my-3" />

        <div className="flex gap-3">
          <span className="text-xl">🧐</span>
          <div>
            <p className="font-340">입력값 기반 견적 요약</p>
            <p className="text-xs text-gray-500">
              보증인원 {guarantee.toLocaleString("ko-KR")}명 · 식대{" "}
              {formatWon(mealPriceWon)} · 대관료 {formatWon(hallFeeWon)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              총 예상비용 {formatWon(totalWon)} (기타 옵션{" "}
              {formatWon(optionEtcWon)} 포함, 샘플)
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="text-xl">💸</span>
          <div>
            <p className="font-340">다소 부실한 서비스(선택) 항목</p>
            <p className="text-xs text-gray-500">
              폐백, 현악 4중주 등은 제공되지 않는 점을 참고하세요. (샘플 문구)
            </p>
          </div>
        </div>
      </section>

      {/* 3️⃣ 식대 분포 (차트 자리) */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-350 text-lg mb-4">
          강남구 웨딩홀 {time} 식대 분포
        </h2>

        <div>
          <MealLineChart
            highlightX={mealPriceWon}
            highlightLabel={formatWon(mealPriceWon)}
          />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          * {formatWon(mealPriceWon)}은 {regionName} 지역에서 상위{" "}
          {formatPercent(percentile)}% 내에 포함됩니다.
        </p>
      </section>

      {/* 4️⃣ 항목별 가성비 분석 */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="font-350 text-lg">항목별 가성비 분석</h2>

        <Progress
          label="대관료"
          value={Math.max(
            10,
            Math.min(95, 100 - Math.round(hallFeeWon / 2000000)),
          )}
          color="bg-emerald-400"
          note="샘플 점수"
          noteColor="text-emerald-400"
        />
        <Progress
          label="식대 (음주류 포함)"
          value={Math.max(
            10,
            Math.min(95, 100 - Math.round(mealPriceWon / 8000)),
          )}
          color="bg-yellow-400"
          note="샘플 점수"
          noteColor="text-[#f5a216]"
        />
        <Progress
          label="필수 옵션"
          value={20}
          color="bg-red-400"
          note="샘플 점수"
          noteColor="text-red-400"
        />
      </section>

      {/* 5️⃣ 주요 항목 비교 */}
      <section className="bg-white rounded-2xl shadow p-5 ">
        <h2 className="font-350 text-lg mb-4">주요 항목 상세 비교</h2>

        <div className="grid grid-cols-3 text-sm items-center text-center">
          <div className="text-xs ">항목</div>
          <div className="text-xs">타 웨딩홀 평균</div>
          <div className="text-xs">{regionName}</div>

          {rows.map((r) => (
            <React.Fragment key={r.item}>
              <div className="py-4 text-xs">{r.item}</div>
              <div className="">{r.avg}</div>
              <div className="">{r.maison}</div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 6️⃣ CTA */}
      <section className="bg-slate-800 rounded-2xl p-6 text-white text-center space-y-3">
        <p className="font-340 text-lg mb-2">
          잠깐! 다른 웨딩홀도 분석해보고 싶으신가요?
        </p>
        <div className="text-xs text-slate-300">
          <p>이용권을 구매하고 당일 계약 혜택이 있는 웨딩홀을 알아보세요</p>
        </div>

        <div className="flex gap-5 text-xs font-350 mt-6">
          <button className="flex-1 bg-white text-slate-800 py-3 rounded-xl ">
            웨딩팩폭 서비스 둘러보기
          </button>
          <button className="flex-1 bg-main py-3 rounded-xl font-semibold">
            1달 이용권 구매 (4,900원)
          </button>
        </div>
      </section>

      <div className="text-xs text-gray-400 text-center">
        <p>동일 지역 및 시기의 계약 기반 분석 결과입니다. (샘플)</p>
        <p>
          본 결과는 참고용으로 실제 계약 내용은 해당 웨딩홀로 문의 바랍니다.
        </p>
      </div>
    </main>
  );
}

/* ---------- 서브 컴포넌트 ---------- */

function Progress({
  label,
  value,
  color,
  note,
  noteColor,
}: {
  label: string;
  value: number;
  color: string;
  note: string;
  noteColor: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className={`font-semibold ${noteColor}`}>{note}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
