"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, UploadTask } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";
import { resizeImageFile } from "../components/ResizeImage";
import { generateJobId } from "../components/DateFunction";
import {
  looksLikeQuota429,
  TEMP_ERROR_MSG,
  toUserMessage,
} from "../utils/uploadErrors";

type UploadOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

type CompletePayload<T = unknown> = {
  jobId: string;
  data: T;
};

// Firestore ocrJobs 문서 형태(프로젝트에 맞춰 더 구체화 가능)
type OCRJobDoc = {
  done?: boolean;
  text?: string;
  result?: string;
  rawText?: string;
  error?: unknown;
  // 기타 필드들...
  [k: string]: unknown;
};

export function useUploadAndAnalyze() {
  const [jobId, setJobId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<OCRJobDoc | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const unsubRef = useRef<null | (() => void)>(null);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  // 현재 실행(run)을 소유하는 내부 AbortController
  const runAbortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = null;

    if (uploadTaskRef.current) {
      try {
        uploadTaskRef.current.cancel();
      } catch {
        // ignore
      }
    }
    uploadTaskRef.current = null;

    // 내부 run abort controller 정리(외부 signal과 별개)
    if (runAbortRef.current) {
      try {
        runAbortRef.current.abort();
      } catch {
        // ignore
      }
      runAbortRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const waitForDone = useCallback((id: string, signal: AbortSignal) => {
    return new Promise<OCRJobDoc>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const onAbort = () => {
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });

      unsubRef.current = onSnapshot(doc(db, "ocrJobs", id), (snap) => {
        if (signal.aborted) return;
        if (!snap.exists()) return;

        const data = snap.data() as OCRJobDoc;

        if (data?.error) {
          const is429 = looksLikeQuota429(data.error);
          const msg = is429 ? TEMP_ERROR_MSG : `에러: ${String(data.error)}`;
          const err = new Error(msg) as Error & { status?: number };
          if (is429) err.status = 429;
          reject(err);
          return;
        }

        const text = data.text || data.result || data.rawText || "";
        if (text) setError(text);

        const done = !!(
          data.text ||
          data.result ||
          data.rawText ||
          data.done === true
        );
        if (done) resolve(data);
      });

      // 정리
      const originalUnsub = unsubRef.current;
      unsubRef.current = () => {
        signal.removeEventListener("abort", onAbort);
        originalUnsub?.();
      };
    });
  }, []);

  const uploadFileToStorage = useCallback(
    async (file: File, storagePath: string, signal: AbortSignal) => {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });
      uploadTaskRef.current = task;

      // abort 시 업로드 취소
      const onAbort = () => {
        try {
          task.cancel();
        } catch {
          // ignore
        }
      };
      signal.addEventListener("abort", onAbort, { once: true });

      try {
        await new Promise<void>((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => {
              const total = snap.totalBytes || 0;
              const transferred = snap.bytesTransferred || 0;
              const pct =
                total > 0 ? Math.round((transferred / total) * 100) : 0;
              setMessage(`업로드 중... (${pct}%)`);
            },
            reject,
            resolve,
          );
        });
      } finally {
        signal.removeEventListener("abort", onAbort);
      }
    },
    [],
  );

  const uploadAndAnalyze = useCallback(
    async (
      inputFile: File,
      options?: UploadOptions,
    ): Promise<CompletePayload<OCRJobDoc>> => {
      cleanup();

      setIsLoading(true);
      setError("");
      setResultData(null);

      const id = generateJobId();
      setJobId(id);

      // 이번 run 전용 내부 controller
      const runController = new AbortController();
      runAbortRef.current = runController;

      // 외부 signal + timeout을 내부 signal에 “합성”
      const timeoutMs = options?.timeoutMs ?? 0;
      const timeoutId =
        timeoutMs > 0
          ? setTimeout(() => {
              runController.abort(); // timeout도 abort로 통일
              const msg =
                "시간이 너무 오래 걸립니다. 네트워크 상태를 확인하고 다시 시도해주세요.";
              setMessage(msg);
            }, timeoutMs)
          : null;

      const forwardAbort = () => runController.abort();
      if (options?.signal) {
        if (options.signal.aborted) runController.abort();
        else
          options.signal.addEventListener("abort", forwardAbort, {
            once: true,
          });
      }

      try {
        setMessage("이미지 최적화 중...");
        const uploadFile = await resizeImageFile(inputFile, 1600, 0.85);

        const originalFileName = inputFile.name;
        const yyyyMMdd = id.slice(0, 8);
        const hhmmssR = id.slice(9, 17);
        const storagePath = `uploads/${yyyyMMdd}/${hhmmssR}_${originalFileName}`;

        setMessage("업로드 중... (0%)");

        // 1) done 대기 시작(리스너 먼저)
        const donePromise = waitForDone(id, runController.signal);

        // 2) 업로드
        await uploadFileToStorage(
          uploadFile,
          storagePath,
          runController.signal,
        );

        setMessage("분석 중...");

        // 3) 완료 대기
        const data = await donePromise;

        setResultData(data);
        return { jobId: id, data };
      } catch (e) {
        const msg = toUserMessage(e);
        // Abort는 굳이 에러 메시지 덮어쓰지 않도록 프로젝트 성격에 맞게 조절 가능
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setMessage(msg);

          // 429면 상위에서 구분 가능하게 status 부여(기존 동작 유지)
          if (looksLikeQuota429(e) && e && typeof e === "object") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e as any).status = 429;
          }
        }
        throw e;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (options?.signal)
          options.signal.removeEventListener("abort", forwardAbort);
        cleanup(); // 리스너/업로드 task 정리
        setIsLoading(false);
      }
    },
    [cleanup, uploadFileToStorage, waitForDone],
  );

  const clear = useCallback(() => {
    cleanup();
    setJobId("");
    setIsLoading(false);
    setResultData(null);
    setError("");
  }, [cleanup]);

  return {
    jobId,
    message,
    isLoading,
    resultData,
    error,
    uploadAndAnalyze,
    clear,
  };
}
