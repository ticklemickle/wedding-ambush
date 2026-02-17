"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Field<T> {
  v: T | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: any | null;
}

interface Estimate {
  date: Field<string>;
  day: Field<string>;
  time: Field<string>;
  rental: Field<number>;
  meal: Field<number>;
  guests: Field<number>;
  total_cost: Field<number>;
}

interface Props {
  params: {
    jobId: string;
  };
}

const emptyEstimate = (): Estimate => ({
  date: { v: null, a: null },
  day: { v: null, a: null },
  time: { v: null, a: null },
  rental: { v: null, a: null },
  meal: { v: null, a: null },
  guests: { v: null, a: null },
  total_cost: { v: null, a: null },
});

export default function Page({ params }: Props) {
  const { jobId } = params;
  const router = useRouter();

  const [data, setData] = useState({
    overall: { a: null },
    venue: { v: "", a: null },
    estimates: [emptyEstimate()],
  });

  const updateEstimate = (
    index: number,
    key: keyof Estimate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
  ) => {
    const next = [...data.estimates];
    next[index] = {
      ...next[index],
      [key]: { ...next[index][key], v: value },
    };
    setData({ ...data, estimates: next });
  };

  const addEstimate = () => {
    setData({
      ...data,
      estimates: [...data.estimates, emptyEstimate()],
    });
  };

  const onAnalyze = async () => {
    await fetch(`/api/ocr/jobs/${jobId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    router.push(`/ocr/analysis/${jobId}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>OCR 견적 입력</h2>
      <p>Job ID: {jobId}</p>

      <div style={{ marginBottom: 16 }}>
        <label>예식장</label>
        <input
          style={{ width: "100%" }}
          value={data.venue.v}
          onChange={(e) =>
            setData({
              ...data,
              venue: { ...data.venue, v: e.target.value },
            })
          }
        />
      </div>

      {data.estimates.map((est, i) => (
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

          {(
            [
              ["date", "날짜"],
              ["day", "요일"],
              ["time", "시간"],
              ["rental", "대관료"],
              ["meal", "식대"],
              ["guests", "하객 수"],
              ["total_cost", "총 비용"],
            ] as [keyof Estimate, string][]
          ).map(([key, label]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <label>{label}</label>
              <input
                style={{ width: "100%" }}
                value={est[key].v ?? ""}
                onChange={(e) => updateEstimate(i, key, e.target.value)}
              />
            </div>
          ))}
        </div>
      ))}

      <button onClick={addEstimate}>견적 추가</button>

      <hr style={{ margin: "24px 0" }} />

      <button
        onClick={onAnalyze}
        style={{ padding: "12px 24px", fontWeight: "bold" }}
      >
        분석하기
      </button>
    </div>
  );
}
