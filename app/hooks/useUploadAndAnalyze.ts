"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";
import { resizeImageFile } from "../components/ResizeImage";

function getTimestamp() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

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

  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const uploadAndAnalyze = useCallback(
    async (
      inputFile: File,
      opts?: {
        onComplete?: (payload: CompletePayload) => void;
        onError?: (message: string) => void;
      }
    ) => {
      if (unsubRef.current) unsubRef.current();

      setIsLoading(true);
      setStatusText("업로드 준비 중...");
      setResultData(null);

      // 이미지 리사이즈 (이미지 전용 업로드 전제)
      const uploadFile = await resizeImageFile(inputFile, 1600, 0.85);

      const id =
        `${getTimestamp()}_` +
        Math.random().toString(36).substring(2, 5) +
        "_" +
        uploadFile.name;

      setJobId(id);
      setStatusText("업로드 중...");

      unsubRef.current = onSnapshot(doc(db, "ocrJobs", id), (snap) => {
        if (!snap.exists()) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = snap.data() as any;

        if (data?.error) {
          const msg = `에러: ${data.error}`;
          setStatusText(msg);
          setIsLoading(false);
          opts?.onError?.(msg);
          return;
        }

        // 백엔드가 저장하는 키 우선순위
        const text = data.text || data.result || data.rawText || "";
        if (text) setStatusText(text);

        // 완료 판단: 결과가 들어왔을 때
        // (프로젝트에 맞게 data.status === "DONE" 같은 조건이 있으면 그걸로 바꿔도 됩니다)
        if (
          data &&
          (data.text || data.result || data.rawText || data.done === true)
        ) {
          setResultData(data);
          setIsLoading(false);
          opts?.onComplete?.({ jobId: id, data });
        }
      });

      const storageRef = ref(storage, `uploads/${id}`);
      await uploadBytes(storageRef, uploadFile, {
        contentType: uploadFile.type,
      });

      setStatusText("분석 중...");
    },
    []
  );

  return {
    jobId,
    statusText,
    isLoading,
    resultData,
    uploadAndAnalyze,
    clear: () => {
      setJobId("");
      setStatusText("");
      setIsLoading(false);
      setResultData(null);
      if (unsubRef.current) unsubRef.current();
      unsubRef.current = null;
    },
  };
}
