"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";
import { resizeImageFile } from "../components/ResizeImage";
import { generateJobId } from "../components/DateFunction";

type CompletePayload = {
  jobId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

export function useUploadAndAnalyze() {
  const [jobId, setJobId] = useState("");
  const [statusText, setStatusText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const unsubRef = useRef<null | (() => void)>(null);

  const cleanupSnapshot = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = null;
  }, []);

  useEffect(() => cleanupSnapshot, [cleanupSnapshot]);

  const uploadAndAnalyze = useCallback(
    async (inputFile: File) => {
      cleanupSnapshot();

      setIsLoading(true);
      setError("");
      setResultData(null);
      setStatusText("업로드 준비 중...");

      const id = generateJobId();
      setJobId(id);

      try {
        // 이미지 리사이즈 (이미지 전용 업로드 전제)
        const uploadFile = await resizeImageFile(inputFile, 1600, 0.85);
        const originalFileName = inputFile.name;

        const yyyyMMdd = id.slice(0, 8);
        const storagePath = `uploads/${yyyyMMdd}/${id}_${originalFileName}`;

        setStatusText("업로드 중...");

        // 완료를 기다릴 Promise (snapshot이 done/결과를 찍어주는 순간 resolve)
        const donePromise = new Promise<CompletePayload>((resolve, reject) => {
          unsubRef.current = onSnapshot(doc(db, "ocrJobs", id), (snap) => {
            if (!snap.exists()) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = snap.data() as any;

            if (data?.error) {
              const msg = `에러: ${data.error}`;
              setError(msg);
              setStatusText(msg);
              cleanupSnapshot();
              reject(new Error(msg));
              return;
            }

            // 백엔드가 저장하는 키 우선순위
            const text = data.text || data.result || data.rawText || "";
            if (text) setStatusText(text);

            const done =
              !!data &&
              (data.text || data.result || data.rawText || data.done === true);

            if (done) {
              setResultData(data);
              cleanupSnapshot();
              resolve({ jobId: id, data });
            }
          });
        });

        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, uploadFile, {
          contentType: uploadFile.type,
        });

        setStatusText("분석 중...");
        // 분석 완료 대기
        const payload = await donePromise;
        return payload;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
        setError(msg);
        setStatusText(msg);
        cleanupSnapshot();
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [cleanupSnapshot]
  );

  const clear = useCallback(() => {
    setJobId("");
    setStatusText("");
    setIsLoading(false);
    setResultData(null);
    setError("");
    cleanupSnapshot();
  }, [cleanupSnapshot]);

  return {
    jobId,
    statusText,
    isLoading,
    resultData,
    error,
    uploadAndAnalyze,
    clear,
  };
}
