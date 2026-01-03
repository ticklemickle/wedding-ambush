import "./globals.css";

export const metadata = {
  title: "웨딩팩폭",
  description: "웨딩홀 견적서 AI 분석 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
