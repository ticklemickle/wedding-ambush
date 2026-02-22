// app/result/loading.tsx

import FullScreenLoader from "../components/FullScreenLoader";

export default function Loading() {
  return (
    <FullScreenLoader
      label="분석 중 입니다..."
      subLabel="잠시만 기다려주세요"
    />
  );
}
