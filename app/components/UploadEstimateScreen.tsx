"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import FullScreenLoader from "./FullScreenLoader";

const TIME_OPTIONS = [
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

function clampNumberString(v: string) {
  return v.replace(/[^0-9]/g, "");
}

function getKoreanWeekday(date: Date) {
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

export default function UploadEstimateScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [uiError, setUiError] = useState("");

  // Form state (UI)
  const [weddingHall, setWeddingHall] = useState("");
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("12");
  const [day, setDay] = useState("31");
  const [time, setTime] = useState("11:00");
  const [guarantee, setGuarantee] = useState("");
  const [mealPrice, setMealPrice] = useState("");
  const [hallFee, setHallFee] = useState("");

  const weekday = useMemo(() => {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!y || !m || !d) return "";
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return "";
    return getKoreanWeekday(dt);
  }, [year, month, day]);

  const canSubmit = useMemo(() => {
    return (
      !!weddingHall &&
      year.length === 4 &&
      !!month &&
      !!day &&
      !!time &&
      !!guarantee &&
      !!mealPrice &&
      !!hallFee
    );
  }, [weddingHall, year, month, day, time, guarantee, mealPrice, hallFee]);

  const onSubmit = async () => {
    if (isLoading) return;
    setUiError("");

    if (!canSubmit) {
      setUiError("필수 항목을 모두 입력해주세요.");
      return;
    }

    // 디자인 반영 목적의 UI 화면입니다.
    // 실제 분석 API/라우팅은 프로젝트 스펙에 맞춰 연결해 주세요.
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        weddingHall,
        date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        time,
        guarantee,
        mealPrice,
        hallFee,
      });
      router.push(`/result?${params.toString()}`);
    } catch {
      setUiError("요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex justify-center bg-[#f9fafb] p-2">
      <main
        className={[
          "bg-white flex flex-col items-center text-center relative",
          "w-full max-w-md",
          "border-4 border-main rounded-3xl",
          "px-4 py-12",
        ].join(" ")}
      >
        {isLoading && (
          <FullScreenLoader
            label="분석 중입니다..."
            subLabel="잠시만 기다려주세요."
          />
        )}

        <div className="max-w-md w-full relative z-10 flex flex-col flex-1">
          <p className="text-gray-700 font-350 text-base mb-6">
            1,265건 이상의 견적서 기반
            <br />
            AI 분석 결과를 10초만에 받아보세요
          </p>

          <div className="flex justify-center mb-8 mt-4">
            <Image
              src="/mainLogo.png"
              alt="웨딩팩폭"
              width={180}
              height={80}
              priority
            />
          </div>

          {/* Form */}
          <div className="w-full px-2">
            {/* Wedding hall select */}
            <div className="relative w-full mt-2">
              <select
                value={weddingHall}
                onChange={(e) => setWeddingHall(e.target.value)}
                className={[
                  "w-full h-[56px] rounded-2xl",
                  "border border-gray-300",
                  "px-5 pr-12",
                  "text-base",
                  weddingHall ? "text-gray-900" : "text-gray-400",
                  "outline-none focus:ring-2 focus:ring-main/30 focus:border-main",
                  "appearance-none bg-white",
                ].join(" ")}
              >
                <option value="" disabled>
                  웨딩홀 선택
                </option>
                {/* 예시 옵션 - 실제 데이터로 교체 */}
                <option value="a">A 웨딩홀</option>
                <option value="b">B 웨딩홀</option>
                <option value="c">C 웨딩홀</option>
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                ▼
              </span>
            </div>

            <div className="mt-8 space-y-5">
              {/* Date */}
              <div className="w-full text-left font-700 text-black tracking-[-0.02em]">
                <div className="grid grid-cols-[minmax(54,2.5fr)_auto_minmax(44px,2fr)_auto_minmax(44px,2fr)_auto_auto] items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={year}
                    onChange={(e) =>
                      setYear(clampNumberString(e.target.value).slice(0, 4))
                    }
                    className="w-full min-w-0 h-[46px] rounded-xl border border-gray-300 text-center text-gray-500 outline-none focus:ring-2 focus:ring-main/30 focus:border-main"
                    placeholder="YYYY"
                  />
                  <span className="text-base whitespace-nowrap">년</span>

                  <input
                    inputMode="numeric"
                    value={month}
                    onChange={(e) =>
                      setMonth(clampNumberString(e.target.value).slice(0, 2))
                    }
                    className="w-full min-w-0 h-[46px] rounded-xl border border-gray-300 text-center text-gray-500 outline-none focus:ring-2 focus:ring-main/30 focus:border-main"
                    placeholder="MM"
                  />
                  <span className="text-base whitespace-nowrap">월</span>

                  <input
                    inputMode="numeric"
                    value={day}
                    onChange={(e) =>
                      setDay(clampNumberString(e.target.value).slice(0, 2))
                    }
                    className="w-full min-w-0 h-[46px] rounded-xl border border-gray-300 text-center text-gray-500 outline-none focus:ring-2 focus:ring-main/30 focus:border-main"
                    placeholder="DD"
                  />
                  <span className="text-base whitespace-nowrap">일</span>

                  <span className="w-full text-center mx-1 text-lg">
                    ({weekday || "-"})
                  </span>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-[88px_1fr] items-center gap-4">
                <div className="text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                  시간
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {TIME_OPTIONS.map((t) => {
                    const selected = time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTime(t)}
                        className={[
                          "h-[44px] min-w-[78px] px-4 rounded-xl border",
                          "text-base",
                          selected
                            ? "bg-main border-main text-white"
                            : "bg-white border-gray-300 text-gray-500",
                        ].join(" ")}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guarantee */}
              <div className="grid grid-cols-[88px_1fr] items-center gap-4">
                <div className="text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                  보증인원
                </div>
                <div className="relative">
                  <select
                    value={guarantee}
                    onChange={(e) => setGuarantee(e.target.value)}
                    className={[
                      "w-full h-[56px] rounded-2xl",
                      "border border-gray-300",
                      "px-5 pr-12",
                      "text-base",
                      guarantee ? "text-gray-900" : "text-gray-400",
                      "outline-none focus:ring-2 focus:ring-main/30 focus:border-main",
                      "appearance-none bg-white",
                    ].join(" ")}
                  >
                    <option value="" disabled>
                      선택
                    </option>
                    <option value="100">100명</option>
                    <option value="150">150명</option>
                    <option value="200">200명</option>
                    <option value="250">250명</option>
                    <option value="300">300명</option>
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ▼
                  </span>
                </div>
              </div>

              {/* Meal price */}
              <div className="grid grid-cols-[88px_1fr] items-center gap-4">
                <div className="text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                  식대
                </div>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    value={mealPrice}
                    onChange={(e) =>
                      setMealPrice(
                        clampNumberString(e.target.value).slice(0, 8),
                      )
                    }
                    className="w-full h-[56px] rounded-2xl border border-gray-300 px-5 pr-12 text-base text-gray-900 outline-none focus:ring-2 focus:ring-main/30 focus:border-main"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    원
                  </span>
                </div>
              </div>

              {/* Hall fee */}
              <div className="grid grid-cols-[88px_1fr] items-center gap-4">
                <div className="text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                  홀 대관료
                </div>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    value={hallFee}
                    onChange={(e) =>
                      setHallFee(clampNumberString(e.target.value).slice(0, 8))
                    }
                    className="w-full h-[56px] rounded-2xl border border-gray-300 px-5 pr-12 text-base text-gray-900 outline-none focus:ring-2 focus:ring-main/30 focus:border-main"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    만원
                  </span>
                </div>
              </div>
            </div>

            {!!uiError && (
              <p className="mt-4 text-sm text-red-500 text-center">{uiError}</p>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading}
              className={[
                "mt-10 w-full h-[62px] rounded-2xl",
                "bg-main text-white sm:text-lg md:text-xl font-700",
                "disabled:opacity-60",
              ].join(" ")}
            >
              내 견적 분석 받기
            </button>
          </div>

          <p className="text-xs text-gray-400 underline cursor-pointer mt-auto pt-8 pb-2">
            웨딩팩폭 더 알아보기
          </p>
        </div>
      </main>
    </div>
  );
}
