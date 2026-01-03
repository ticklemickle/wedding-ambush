export default async function ResultPage({
  params,
}: {
  params: { jobId: string };
}) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 space-y-6 max-w-md mx-auto">
      {/* 1️⃣ 상단 요약 카드 */}
      <section className="bg-white rounded-2xl shadow p-5 text-center border-t-4 border-emerald-400">
        <p className="text-sm text-gray-500">
          메종드아나하 웨딩홀 (10월 06일 · 일요일)
        </p>
        <h1 className="text-3xl font-extrabold text-emerald-500 mt-2">
          가성비 등판
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          “지금 <span className="text-emerald-500 font-semibold">당장</span>{" "}
          계약하세요! 다시는 안 올 가격”
        </p>
      </section>

      {/* 2️⃣ 팩트 요약 */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">팩트 폭행 한 줄 요약</h2>

        <div className="flex gap-3">
          <span className="text-2xl">🙂</span>
          <div>
            <p className="font-semibold">강남구 기준 매우 가성비 있는 견적</p>
            <p className="text-sm text-gray-500">
              총 예상비용 27,900,000원은 토요일 3시 기준 합리적인 가격입니다.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold">다소 부실한 서비스(선택) 항목</p>
            <p className="text-sm text-gray-500">
              폐백, 현악 4중주 등은 제공되지 않는 점을 참고하세요.
            </p>
          </div>
        </div>
      </section>

      {/* 3️⃣ 식대 분포 (차트 자리) */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-lg mb-4">강남구 웨딩홀 3시 식대 분포</h2>

        {/* 차트 더미 */}
        <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
          📈 식대 분포 차트 영역 (샘플)
        </div>

        <p className="text-xs text-gray-500 mt-2">
          * 65,000원은 강남구 웨딩홀 식대 하위 30% 이내입니다.
        </p>
      </section>

      {/* 4️⃣ 항목별 가성비 분석 */}
      <section className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="font-bold text-lg">항목별 가성비 분석</h2>

        <Progress
          label="대관료"
          value={90}
          color="bg-emerald-400"
          note="상위 10% (매우 저렴)"
        />
        <Progress
          label="식대 (음주류 포함)"
          value={60}
          color="bg-yellow-400"
          note="평균 수준"
        />
        <Progress
          label="필수 옵션"
          value={20}
          color="bg-red-400"
          note="하위 20% (비쌈)"
        />
      </section>

      {/* 5️⃣ 주요 항목 비교 */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-lg mb-4">주요 항목 상세 비교</h2>

        <div className="grid grid-cols-3 text-sm">
          <div className="font-semibold text-gray-500">항목</div>
          <div className="font-semibold text-center">타 웨딩홀 평균</div>
          <div className="font-semibold text-center">메종드아나하</div>

          <div className="py-2">포토테이블</div>
          <div className="text-center">서비스</div>
          <div className="text-center">서비스</div>

          <div className="py-2">피아노 3중주</div>
          <div className="text-center">서비스</div>
          <div className="text-center text-gray-400">미제공</div>

          <div className="py-2">전문사회자</div>
          <div className="text-center">30만원</div>
          <div className="text-center text-red-500">35만원</div>

          <div className="py-2">혼구용품</div>
          <div className="text-center">20만원</div>
          <div className="text-center text-emerald-500">15만원</div>
        </div>
      </section>

      {/* 6️⃣ CTA */}
      <section className="bg-slate-800 rounded-2xl p-6 text-white text-center space-y-4">
        <p className="font-semibold text-lg">
          다른 강남권 웨딩홀도 분석해보고 싶으신가요?
        </p>
        <p className="text-sm text-slate-300">
          이용권을 구매하면 당일 계약 혜택 웨딩홀을 확인할 수 있어요
        </p>

        <div className="flex gap-3">
          <button className="flex-1 bg-white text-slate-800 py-3 rounded-xl font-semibold">
            서비스 둘러보기
          </button>
          <button className="flex-1 bg-emerald-500 py-3 rounded-xl font-semibold">
            이용권 구매 (4,900원)
          </button>
        </div>
      </section>

      <p className="text-xs text-gray-400 text-center">
        본 결과는 참고용이며 실제 계약 내용은 웨딩홀에 확인 바랍니다.
      </p>
    </main>
  );
}

/* ---------- 서브 컴포넌트 ---------- */

function Progress({
  label,
  value,
  color,
  note,
}: {
  label: string;
  value: number;
  color: string;
  note: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">{note}</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
