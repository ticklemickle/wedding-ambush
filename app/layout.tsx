import "./globals.css";
import localFont from "next/font/local";

export const metadata = {
  title: "웨딩팩폭",
  description: "웨딩홀 견적서 AI 분석 서비스",
};

const youn310 = localFont({
  src: "../public/fonts/youn310.woff2",
  display: "swap",
  variable: "--font-youn310",
});
const youn320 = localFont({
  src: "../public/fonts/youn320.woff2",
  display: "swap",
  variable: "--font-youn320",
});
const youn330 = localFont({
  src: "../public/fonts/youn330.woff2",
  display: "swap",
  variable: "--font-youn330",
});
const youn340 = localFont({
  src: "../public/fonts/youn340.woff2",
  display: "swap",
  variable: "--font-youn340",
});
const youn350 = localFont({
  src: "../public/fonts/youn350.woff2",
  display: "swap",
  variable: "--font-youn350",
});
const Jalnan2 = localFont({
  src: "../public/fonts/Jalnan2.otf",
  display: "swap",
  variable: "--font-Jalnan2",
});

const fontVars = [
  youn310.variable,
  youn320.variable,
  youn330.variable,
  youn340.variable,
  youn350.variable,
  Jalnan2.variable,
].join(" ");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={fontVars}>
      <body className="bg-white font-youn330">{children}</body>
    </html>
  );
}
