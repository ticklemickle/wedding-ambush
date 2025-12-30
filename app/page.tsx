"use client";

import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string>("");
  const [text, setText] = useState<string>("");

  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const upload = async () => {
    if (!file) return;

    // 이전 구독 해제
    if (unsubRef.current) unsubRef.current();

    const id = crypto.randomUUID();
    setJobId(id);
    setText("업로드 중...");

    // Firestore 결과 실시간 구독
    unsubRef.current = onSnapshot(doc(db, "ocrJobs", id), (snap) => {
      if (!snap.exists()) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = snap.data() as any;
      if (data.error) setText(`에러: ${data.error}`);
      else setText(data.text || "");
    });

    // Storage 업로드 (functions가 이 경로 업로드를 트리거로 OCR 수행)
    const storageRef = ref(storage, `uploads/${id}`);
    await uploadBytes(storageRef, file, { contentType: file.type });

    setText("OCR 처리 중...");
  };

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>OCR Prototype (Image only)</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button onClick={upload} disabled={!file} style={{ marginLeft: 12 }}>
        Upload & OCR
      </button>

      {jobId && <p>jobId: {jobId}</p>}

      <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{text}</pre>
    </main>
  );
}
