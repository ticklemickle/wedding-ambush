"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import FullScreenLoader from "./FullScreenLoader";
import {
  normalizeDay,
  normalizeMonth,
  sanitizeDayInput,
  sanitizeMonthInput,
  validateDayForYearMonth,
} from "../utils/dateFields";
import {
  applyMoneyChange,
  isMoneyValid,
  maxDigitsFromMax,
  normalizeOnBlur,
} from "../utils/priceUtil";

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

const MEAL_MIN = 10000;
const MEAL_MAX = 500000;
const HALL_MIN = 0;
const HALL_MAX = 100000000;

const MEAL_DIGITS = maxDigitsFromMax(MEAL_MAX); // 6
const HALL_DIGITS = maxDigitsFromMax(HALL_MAX); // 9

export default function UploadEstimateScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [uiError, setUiError] = useState("");

  // Form state (UI)
  const [weddingHall, setWeddingHall] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("11:00");
  const [guarantee, setGuarantee] = useState("");
  const [mealPrice, setMealPrice] = useState("");
  const [mealPriceTouched, setMealPriceTouched] = useState(false);
  const [hallFeeTouched, setHallFeeTouched] = useState(false);
  const [hallFee, setHallFee] = useState("");

  const onMonthChange = (v: string) => setMonth(sanitizeMonthInput(v));
  const onDayChange = (v: string) => setDay(sanitizeDayInput(v));

  const mealValid = isMoneyValid(mealPrice, MEAL_MIN, MEAL_MAX, true);
  const hallValid = isMoneyValid(hallFee, HALL_MIN, HALL_MAX, true);

  const mealInvalid = mealPriceTouched && !mealValid;
  const hallInvalid = hallFeeTouched && !hallValid;

  const onMonthBlur = () => {
    const m = normalizeMonth(month);
    const d = validateDayForYearMonth(year, m, day);
    setMonth(m);
    if (year && m) setDay(d);
    else if (!m) setDay(""); // month 무효면 day도 비움(원치 않으면 제거)
  };

  const onDayBlur = () => {
    const dNorm = normalizeDay(day);
    const d = validateDayForYearMonth(year, month, dNorm);
    setDay(d);
  };

  // year/month 바뀌어서 day가 존재하지 않는 날짜가 되면 자동으로 비움
  useEffect(() => {
    const d = validateDayForYearMonth(year, month, day);
    if (d !== day) setDay(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

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
      setUiError("입력되지 않은 항목을 확인 해주세요");
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
          "px-4 pt-12 pb-2",
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
                  " bg-white",
                  "appearance-none",
                ].join(" ")}
              >
                <option value="" disabled>
                  예식 지역 선택
                </option>
                {/* 예시 옵션 - 실제 데이터로 교체 */}
                <option value="a">서울 강남</option>
                <option value="b">서울 강북</option>
                <option value="c">서울 강서</option>
              </select>

              {/* 커스텀 화살표 */}
              <svg
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.7a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div className="mt-8 space-y-5">
              <div className="mb-2 text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                예식 날짜
              </div>
              <div className="w-full text-left font-700 text-black tracking-[-0.02em]">
                <div className="grid grid-cols-[minmax(54,2.5fr)_auto_minmax(44px,2fr)_auto_minmax(44px,2fr)_auto_auto] items-center gap-2">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full min-w-0 h-[46px] rounded-xl border border-gray-300 text-center text-gray-500 outline-none focus:ring-2 focus:ring-main/30 focus:border-main bg-white"
                  >
                    <option value="">선택</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                  <span className="text-base whitespace-nowrap">년</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={month}
                    onChange={(e) => onMonthChange(e.target.value)}
                    onBlur={onMonthBlur}
                    className={[
                      "w-full min-w-0 h-[46px] rounded-xl border text-center outline-none focus:ring-2 border-gray-300 text-gray-500 focus:ring-main/30 focus:border-main",
                      month,
                    ].join(" ")}
                  />
                  <span className="text-base whitespace-nowrap">월</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={day}
                    onChange={(e) => onDayChange(e.target.value)}
                    onBlur={onDayBlur}
                    className={[
                      "w-full min-w-0 h-[46px] rounded-xl border text-center outline-none focus:ring-2 border-gray-300 text-gray-500 focus:ring-main/30 focus:border-main",
                      day,
                    ].join(" ")}
                  />
                  <span className="text-base whitespace-nowrap">일</span>
                </div>
              </div>

              {/* Time */}
              <div className="mb-2 text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                예식 시간
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

              {/* Guarantee */}
              <div className="grid grid-cols-[88px_1fr] items-center gap-4">
                <div className="text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                  보증인원
                </div>
                <div className="relative">
                  <div className="relative">
                    <select
                      value={guarantee}
                      onChange={(e) => setGuarantee(e.target.value)}
                      className={[
                        "w-full h-[56px] rounded-2xl",
                        "border border-gray-300",
                        "px-5 pr-14", // 👉 아이콘 공간 확보
                        "text-base",
                        guarantee ? "text-gray-900" : "text-gray-400",
                        "outline-none focus:ring-2 focus:ring-main/30 focus:border-main",
                        "bg-white",
                        "appearance-none", // 👉 기본 화살표 제거 (핵심)
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

                    <svg
                      className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.7a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Meal price */}
              <div className="grid grid-cols-[88px_1fr] items-center gap-4">
                <div className="text-left font-700 text-black sm:text-lg md:text-xl tracking-[-0.02em]">
                  1인 식대
                </div>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={mealPrice}
                    onChange={(e) =>
                      setMealPrice(
                        applyMoneyChange(e.target.value, MEAL_DIGITS),
                      )
                    }
                    onBlur={() => {
                      setMealPriceTouched(true);
                      setMealPrice(
                        normalizeOnBlur(mealPrice, MEAL_MIN, MEAL_MAX, true),
                      );
                    }}
                    className={[
                      "w-full h-[56px] rounded-2xl border px-5 pr-12 text-base text-right outline-none focus:ring-2",
                      mealInvalid
                        ? "border-red-500 text-red-600 focus:ring-red-200 focus:border-red-500"
                        : "border-gray-300 text-gray-900 focus:ring-main/30 focus:border-main",
                    ].join(" ")}
                    placeholder="50,000"
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={hallFee}
                    onChange={(e) =>
                      setHallFee(applyMoneyChange(e.target.value, HALL_DIGITS))
                    }
                    onBlur={() => {
                      setHallFeeTouched(true);
                      setHallFee(
                        normalizeOnBlur(hallFee, HALL_MIN, HALL_MAX, true),
                      );
                    }}
                    className={[
                      "w-full h-[56px] rounded-2xl border px-5 pr-12 text-base text-right outline-none focus:ring-2",
                      hallInvalid
                        ? "border-red-500 text-red-600 focus:ring-red-200 focus:border-red-500"
                        : "border-gray-300 text-gray-900 focus:ring-main/30 focus:border-main",
                    ].join(" ")}
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    원
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-red-500 text-center min-h-[1.25rem]">
              {uiError}
            </p>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isLoading}
              className={[
                "mt-8 w-full h-[62px] rounded-2xl",
                "bg-main text-white text-lg font-700",
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
