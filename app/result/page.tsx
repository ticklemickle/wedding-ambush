import React from "react";
import { MealLineChart } from "../components/chart/MealLineChart";

export default async function ResultPage({
  params,
}: {
  params: { jobId: string };
}) {
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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 space-y-6 max-w-md mx-auto">
      {/* 1️⃣ 상단 요약 카드 */}
      <section className="bg-white rounded-2xl shadow p-5 text-center border-t-4 border-main">
        <p className="text-sm text-gray-600 font-340">
          메종드아나하 웨딩홀 (10월 06일 일요일)
        </p>
        <h1 className="text-3xl font-Jalnan2 text-main mt-2">갓성비 등판</h1>
        <p className="text-sm font-350 mt-2">
          “지금 <span className="text-main text-lg font-semibold">당장</span>{" "}
          계약하세요! 다시는 안 올 가격”
        </p>
      </section>

      {/* 2️⃣ 팩트 요약 */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="font-350 text-lg mb-1">팩트 폭행 한 줄 요약</h2>
        <hr className="border-t border-gray-200 my-3" />
        <div className="flex gap-3">
          <span className="text-xl">🧐</span>
          <div>
            <p className="font-340">강남구 기준 매우 가성비 있는 견적</p>
            <p className="text-xs text-gray-500">
              총 예상비용 27,900,000원은 토요일 3시 기준 합리적인 가격입니다.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="text-xl">💸</span>
          <div>
            <p className="font-340">다소 부실한 서비스(선택) 항목</p>
            <p className="text-xs text-gray-500">
              폐백, 현악 4중주 등은 제공되지 않는 점을 참고하세요.
            </p>
          </div>
        </div>
      </section>

      {/* 3️⃣ 식대 분포 (차트 자리) */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-350 text-lg mb-4">강남구 웨딩홀 3시 식대 분포</h2>

        {/* 차트 더미 */}
        <div>
          <MealLineChart highlightX={110000} highlightLabel="65,000원" />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          * 65,000원은 강남구 웨딩홀 식대 하위 30% 이내입니다.
        </p>
      </section>

      {/* 4️⃣ 항목별 가성비 분석 */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="font-350 text-lg">항목별 가성비 분석</h2>

        <Progress
          label="대관료"
          value={90}
          color="bg-emerald-400"
          note="상위 10% (매우 저렴)"
          noteColor="text-emerald-400"
        />
        <Progress
          label="식대 (음주류 포함)"
          value={60}
          color="bg-yellow-400"
          note="평균 수준"
          noteColor="text-[#f5a216]"
        />
        <Progress
          label="필수 옵션"
          value={20}
          color="bg-red-400"
          note="하위 20% (비쌈)"
          noteColor="text-red-400"
        />
      </section>

      {/* 5️⃣ 주요 항목 비교 */}
      <section className="bg-white rounded-2xl shadow p-5 ">
        <h2 className="font-350 text-lg mb-4">주요 항목 상세 비교</h2>

        <div className="grid grid-cols-3 text-sm items-center text-center">
          {/* header */}
          <div className="text-xs ">항목</div>
          <div className="text-xs">타 웨딩홀 평균</div>
          <div className="text-xs">메종드아나하</div>

          {/* rows */}
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
        <p>동일 지역 및 시기의 계약 기반 분석 결과입니다.</p>
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
