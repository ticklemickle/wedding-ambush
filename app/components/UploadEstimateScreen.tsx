"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import { useUploadAndAnalyze } from "../hooks/useUploadAndAnalyze";
import { validateImageFile } from "../utils/validateImageFile";
import FullScreenLoader from "./FullScreenLoader";
import { TEMP_ERROR_MSG, toUserMessage } from "../utils/uploadErrors";

const MAX_SIZE = 20 * 1024 * 1024;
const ACCEPT = { "image/*": [] as string[] };

function rejectionMessage(rejections: readonly FileRejection[]) {
  const first = rejections?.[0];
  const code = first?.errors?.[0]?.code;

  if (code === "file-too-large")
    return "파일이 너무 큽니다. 최대 20MB까지 업로드할 수 있어요.";
  if (code === "file-invalid-type") return "이미지 파일만 업로드할 수 있어요.";
  if (rejections?.length) return "업로드할 수 없는 파일입니다.";
  return "";
}

export default function UploadEstimateScreen() {
  const UPLOAD_TIMEOUT_MS = 20_000;

  const router = useRouter();
  const { isLoading, uploadAndAnalyze } = useUploadAndAnalyze();

  const [uiError, setUiError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const inFlightRef = useRef(false);
  const lastFileKeyRef = useRef<string | null>(null);

  // (선택) 컴포넌트 언마운트 시 현재 요청 취소
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUiError("");
      setErrorMsg("");

      if (inFlightRef.current || isLoading) {
        setUiError("이미 업로드가 진행 중입니다. 잠시만 기다려주세요.");
        return;
      }

      const file = acceptedFiles?.[0];
      if (!file) return;

      const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
      if (lastFileKeyRef.current === fileKey) {
        setUiError(
          "같은 파일이 이미 업로드 요청되었습니다. 다른 파일을 선택해주세요.",
        );
        return;
      }

      const valid = validateImageFile(file);
      if (!valid.ok) {
        setErrorMsg(valid.reason);
        return;
      }

      inFlightRef.current = true;
      lastFileKeyRef.current = fileKey;

      // 새 요청 시작 전, 이전 요청이 있으면 취소
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const payload = await uploadAndAnalyze(file, {
          timeoutMs: UPLOAD_TIMEOUT_MS,
          signal: abortRef.current.signal,
        });

        if (!payload?.jobId) {
          setUiError(TEMP_ERROR_MSG);
          lastFileKeyRef.current = null;
          return;
        }

        router.push(`/result?jobId=${encodeURIComponent(payload.jobId)}`);
      } catch (e) {
        // abort 포함 모든 에러를 유틸로 메시지화
        const msg = toUserMessage(e);
        setUiError(msg);

        // 실패면 재시도 허용
        lastFileKeyRef.current = null;
      } finally {
        inFlightRef.current = false;
      }
    },
    [router, uploadAndAnalyze, isLoading],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      multiple: false,
      disabled: isLoading,
      accept: ACCEPT,
      maxSize: MAX_SIZE,
    });

  const dropzoneError = useMemo(
    () => rejectionMessage(fileRejections),
    [fileRejections],
  );
  const message = errorMsg || uiError || dropzoneError;

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

          <div className="flex justify-center">
            <div
              {...getRootProps({
                onClick: (e) => {
                  if (isLoading) e.preventDefault();
                },
              })}
              className={[
                "w-[260px] sm:w-[270px] aspect-square",
                "flex flex-col items-center justify-center",
                "p-6",
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

          {!isDragActive && !!message && (
            <p className="mt-3 text-sm text-red-500">{message}</p>
          )}

          <p className="text-xs text-gray-400 underline cursor-pointer mt-auto pb-2">
            웨딩팩폭 더 알아보기
          </p>
        </div>
      </main>
    </div>
  );
}
