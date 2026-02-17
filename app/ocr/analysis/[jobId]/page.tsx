interface Props {
  params: {
    jobId: string;
  };
}

async function getAnalysis(jobId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/ocr/jobs/${jobId}/analysis`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    throw new Error("분석 결과 조회 실패");
  }

  return res.json();
}

export default async function Page({ params }: Props) {
  const { jobId } = params;
  //   const data = await getAnalysis(jobId);

  const data = {
    venue: { v: "샘플 웨딩홀" },
    estimates: [
      {
        date: { v: "2025-05-10" },
        day: { v: "토요일" },
        time: { v: "오후 2시" },
        rental: { v: 2000000 },
        meal: { v: 80000 },
        guests: { v: 200 },
        total_cost: { v: 36000000 },
      },
    ],
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>OCR 분석 결과</h2>
      <p>Job ID: {jobId}</p>

      <div style={{ marginBottom: 16 }}>
        <strong>예식장:</strong> {data.venue?.v}
      </div>

      {data.estimates.map(
        (
          est: // eslint-disable-next-line @typescript-eslint/no-explicit-any
          any,
          i: number,
        ) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              padding: 16,
              marginBottom: 16,
              borderRadius: 8,
            }}
          >
            <h4>견적 {i + 1}</h4>
            <ul>
              <li>날짜: {est.date?.v}</li>
              <li>요일: {est.day?.v}</li>
              <li>시간: {est.time?.v}</li>
              <li>대관료: {est.rental?.v}</li>
              <li>식대: {est.meal?.v}</li>
              <li>하객 수: {est.guests?.v}</li>
              <li>
                <strong>총 비용: {est.total_cost?.v}</strong>
              </li>
            </ul>
          </div>
        ),
      )}
    </div>
  );
}
