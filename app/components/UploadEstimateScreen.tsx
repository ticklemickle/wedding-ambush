"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FileRejection, useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import { useUploadAndAnalyze } from "../hooks/useUploadAndAnalyze";
import { validateImageFile } from "../utils/validateImageFile";
import FullScreenLoader from "./FullScreenLoader";

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
  const UPLOAD_TIMEOUT_MS = 60_000; // 60초 (원하시면 변경)

  const inFlightRef = useRef(false);
  const lastFileKeyRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);

  const router = useRouter();
  const { jobId, statusText, isLoading, uploadAndAnalyze } =
    useUploadAndAnalyze();

  const [uiError, setUiError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUiError("");
      setErrorMsg("");

      // 1) 중복 업로드 방지: 업로드 진행 중이면 즉시 차단
      if (inFlightRef.current || isLoading) {
        setUiError("이미 업로드가 진행 중입니다. 잠시만 기다려주세요.");
        return;
      }

      const file = acceptedFiles?.[0];
      if (!file) return;

      // 같은 파일 연속 업로드 방지(이름/용량/수정시간 기준)
      const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
      if (lastFileKeyRef.current === fileKey) {
        setUiError(
          "같은 파일이 이미 업로드 요청되었습니다. 다른 파일을 선택해주세요."
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

      // 2) timeout + 늦게 도착한 응답 무시를 위한 request id
      const mySeq = ++requestSeqRef.current;

      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(
            new Error(
              "업로드 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요."
            )
          );
        }, UPLOAD_TIMEOUT_MS);
      });

      try {
        const result = await Promise.race([
          uploadAndAnalyze(file),
          timeoutPromise,
        ]);

        // timeout 이후 늦게 성공 응답이 와도 무시
        if (mySeq !== requestSeqRef.current) return;

        const { jobId } = result as { jobId: string };
        // 요청하신 대로 /result 로 이동 (jobId는 query로 전달)
        router.push(`/result?jobId=${encodeURIComponent(jobId)}`);
      } catch (e) {
        // timeout/업로드 실패 모두 여기로
        if (mySeq !== requestSeqRef.current) return;

        const msg =
          e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.";
        setUiError(msg);

        // 실패면 같은 파일 재시도는 허용하는 편이 UX 좋음 → lastFileKey 해제
        lastFileKeyRef.current = null;
      } finally {
        if (mySeq === requestSeqRef.current) {
          inFlightRef.current = false;
        }
      }
    },
    [router, uploadAndAnalyze, isLoading]
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
    [fileRejections]
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
