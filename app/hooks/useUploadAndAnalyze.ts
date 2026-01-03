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

export function useUploadAndAnalyze() {
  const [jobId, setJobId] = useState("");
  const [statusText, setStatusText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const uploadAndAnalyze = useCallback(async (inputFile: File) => {
    if (unsubRef.current) unsubRef.current();

    setIsLoading(true);
    setStatusText("업로드 준비 중...");

    // 이미지 리사이즈 (PDF 제거 전제)
    const uploadFile = await resizeImageFile(inputFile, 1600, 0.85);

    const id =
      `${getTimestamp()}_` +
      Math.random().toString(36).substring(2, 5) +
      "_" +
      uploadFile.name;

    setJobId(id);
    setStatusText("업로드 중...");

    unsubRef.current = onSnapshot(doc(db, "ocrJobs", id), (snap) => {
      if (!snap.exists()) return; // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = snap.data() as any;

      if (data.error) {
        setStatusText(`에러: ${data.error}`);
        setIsLoading(false);
        return;
      }

      // 백엔드가 저장하는 키에 맞춰서 우선순위 처리
      const text = data.text || data.result || data.rawText || "";
      if (text) {
        setStatusText(text);
        setIsLoading(false);
      }
    });

    const storageRef = ref(storage, `uploads/${id}`);
    await uploadBytes(storageRef, uploadFile, { contentType: uploadFile.type });

    setStatusText("분석 중...");
  }, []);

  return {
    jobId,
    statusText,
    isLoading,
    uploadAndAnalyze,
    clear: () => {
      setJobId("");
      setStatusText("");
      setIsLoading(false);
      if (unsubRef.current) unsubRef.current();
      unsubRef.current = null;
    },
  };
}
