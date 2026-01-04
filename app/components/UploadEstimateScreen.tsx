"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import { useUploadAndAnalyze } from "../hooks/useUploadAndAnalyze";
import { validateImageFile } from "../utils/validateImageFile";
import FullScreenLoader from "./FullScreenLoader";

export default function UploadEstimateScreen() {
  const router = useRouter();
  const { jobId, statusText, isLoading, uploadAndAnalyze } =
    useUploadAndAnalyze();
  const [errorMsg, setErrorMsg] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setErrorMsg("");
      const file = acceptedFiles?.[0];
      if (!file) return;

      const valid = validateImageFile(file);
      if (!valid.ok) {
        setErrorMsg(valid.reason);
        return;
      }

      await uploadAndAnalyze(file, {
        onComplete: ({ jobId }) => {
          // ✅ 분석 완료 시 이동 (원하는 경로로 변경 가능)
          router.push(`/result/${encodeURIComponent(jobId)}`);
        },
        onError: (msg) => setErrorMsg(msg),
      });
    },
    [router, uploadAndAnalyze]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      multiple: false,
      disabled: isLoading, // ✅ 로딩 중 입력 차단
      accept: { "image/*": [] }, // ✅ 이미지 파일만
      maxSize: 20 * 1024 * 1024,
    });

  const dropzoneRejection = useMemo(() => {
    if (fileRejections?.[0]?.errors?.[0]?.code === "file-too-large")
      return "파일이 너무 큽니다. 최대 20MB까지 업로드할 수 있어요.";
    if (fileRejections?.length) return "이미지 파일만 업로드할 수 있어요.";
    return "";
  }, [fileRejections]);

  const message = errorMsg || dropzoneRejection;

  return (
    <div className="min-h-[100dvh] flex justify-center bg-[#f9fafb] p-4">
      <main
        className={[
          "bg-white flex flex-col items-center text-center relative",
          "w-full max-w-md",
          "border-4 border-main rounded-3xl",
          "px-4 py-12",
        ].join(" ")}
      >
        {isLoading && <FullScreenLoader label="업로드 & 분석 중..." />}

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
          <div className="flex justify-center">
            <div
              {...getRootProps({
                // (선택) 로딩 중에는 클릭도 막고 싶으면 유지
                onClick: (e) => {
                  if (isLoading) e.preventDefault();
                },
              })}
              className={[
                "w-[260px] sm:w-[270px] aspect-square",
                "flex flex-col items-center justify-center",
                " p-6",
                "border-[1.5px] border-dashed",

                isLoading ? "opacity-60" : "cursor-pointer",

                isDragActive
                  ? "border-main border-3 bg-main/10"
                  : "border-main-300 bg-transparent",

                !isLoading &&
                  !isDragActive &&
                  "hover:border-main hover:border-3",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input {...getInputProps()} />
              <p className="text-black mb-4">
                {isDragActive ? "여기에 놓아 업로드" : "웨딩홀 견적서 업로드"}
              </p>
              <p className="text-sm text-gray-400 font-310">
                또는 파일을 여기로 끌어 놓으세요
              </p>
              <p className="text-xs text-gray-400 mt-1 font-310">
                이미지 파일만 가능·최대 20MB
              </p>
            </div>
          </div>

          {!!message && <p className="mt-3 text-sm text-red-500">{message}</p>}

          {!!jobId && (
            <p className="mt-6 text-xs text-gray-400">jobId: {jobId}</p>
          )}

          {!!statusText && (
            <pre className="mt-4 text-left text-sm bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap">
              {statusText}
            </pre>
          )}

          <p className="text-xs text-gray-400 underline cursor-pointer mt-auto pb-2">
            웨딩팩폭 더 알아보기
          </p>
        </div>
      </main>
    </div>
  );
}
