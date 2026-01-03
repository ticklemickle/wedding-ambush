"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadAndAnalyze } from "../hooks/useUploadAndAnalyze";
import { validateImageFile } from "../utils/validateImageFile";

export default function UploadEstimateScreen() {
  const { jobId, statusText, isLoading, uploadAndAnalyze } =
    useUploadAndAnalyze();
  const [errorMsg, setErrorMsg] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setErrorMsg("");

      const file = acceptedFiles?.[0];
      if (!file) return;

      // ✅ 앞단 확장자/타입/용량 체크
      const valid = validateImageFile(file);
      if (!valid.ok) {
        setErrorMsg(valid.reason);
        return;
      }

      await uploadAndAnalyze(file);
    },
    [uploadAndAnalyze]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      multiple: false,
      // ✅ 이미지 파일만
      accept: {
        "image/*": [],
      },
      maxSize: 20 * 1024 * 1024,
    });

  // dropzone 레벨 rejection 메시지도 함께 처리 (보조)
  const dropzoneRejection =
    fileRejections?.[0]?.errors?.[0]?.code === "file-too-large"
      ? "파일이 너무 큽니다. 최대 20MB까지 업로드할 수 있어요."
      : fileRejections?.length
      ? "이미지 파일만 업로드할 수 있어요."
      : "";

  const message = errorMsg || dropzoneRejection;

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-start px-4 py-10 text-center">
      <div className="max-w-md w-full">
        <p className="text-gray-700 text-sm mb-6">
          1,265건 이상의 견적서 기반
          <br />
          AI 분석 결과를 10초만에 받아보세요
        </p>

        {/* ✅ 로고: /public/mainLogo.png */}
        <div className="flex justify-center mb-8">
          <Image
            src="/mainLogo.png"
            alt="웨딩팩폭"
            width={180}
            height={80}
            priority
          />
        </div>

        <div
          {...getRootProps()}
          className={[
            "mt-6 border-2 border-dashed rounded-lg py-14 px-4 cursor-pointer transition-colors",
            isDragActive ? "border-primary" : "border-gray-300",
            "hover:border-primary",
          ].join(" ")}
        >
          <input {...getInputProps()} />
          <p className="text-black font-medium mb-2">
            {isDragActive ? "여기에 놓아 업로드" : "웨딩홀 견적서 업로드"}
          </p>
          <p className="text-sm text-gray-500">
            또는 파일을 여기로 끌어 놓으세요
          </p>
          <p className="text-xs text-gray-400 mt-1">
            이미지 가능 · 최대 <strong>20MB</strong>
          </p>

          {isLoading && (
            <p className="mt-4 text-sm text-gray-500">처리 중...</p>
          )}
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

        <p className="text-xs text-gray-400 mt-8 underline cursor-pointer">
          웨딩팩폭 더 알아보기
        </p>
      </div>
    </main>
  );
}
