import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "../components/shell";
export const metadata: Metadata = {
  title: "논문길 · 졸업논문 진행 보드",
  description:
    "전공마다 다른 졸업논문 절차를 한곳에서. 학생·교수·행정실이 함께 보는 진행 보드.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
