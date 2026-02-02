"use client";

export default function FullScreenLoader({
  label = "분석 중 입니다...",
  subLabel = "",
}: {
  label?: string;
  subLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-1">
        <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin mb-6" />
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-sm text-gray-700">{subLabel}</p>
      </div>
    </div>
  );
}
