"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Route,
  CalendarDays,
  FileCheck2,
  History,
  RotateCcw,
  ArrowUpRight,
  Check,
  ArrowLeft,
  Search,
  Megaphone,
} from "lucide-react";
import { useBoard } from "../lib/store";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const hydrated = useBoard((s) => s.hydrated);
  const reset = useBoard((s) => s.reset);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    void Promise.resolve(useBoard.persist.rehydrate()).then(() =>
      useBoard.setState({ hydrated: true }),
    );
    const sync = (e: StorageEvent) => {
      if (e.key === "thesis-board-v1") void useBoard.persist.rehydrate();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const isHome = path === "/";
  return (
    <>
      <a href="#main" className="skip-link">
        본문으로 건너뛰기
      </a>
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Route size={23} />
          </span>
          샤논<span className="brand-caption">졸업논문 진행 보드</span>
        </Link>
        <div className="header-actions">
          {!isHome && (
            <Link href="/" className="home-link">
              <ArrowLeft size={14} /> 역할 선택으로
            </Link>
          )}
          <button
            className="reset-button"
            onClick={() => {
              reset();
              setNotice("데모를 초기 상태로 되돌렸습니다.");
            }}
          >
            <RotateCcw size={14} />
            <span>데모 초기화</span>
          </button>
        </div>
      </header>
      <div className={isHome ? "home-shell" : "app-shell"}>
        {!isHome && (
          <aside className="sidebar">
            <div className="sidebar-label">나의 워크스페이스</div>
            <a href="#main" className="side-link active">
              <LayoutDashboard size={18} />
              진행 대시보드
            </a>
            <a
              href={
                path === "/student"
                  ? "#roadmap"
                  : path === "/admin"
                    ? "#capacity"
                    : "#applications"
              }
              className="side-link"
            >
              <Route size={18} />
              {path === "/student"
                ? "전공별 로드맵"
                : path === "/admin"
                  ? "교수별 지도 현황"
                  : "지도교수 신청 현황"}
            </a>
            <a
              href={path === "/student" ? "#calendar" : "#history"}
              className="side-link"
            >
              {path === "/student" ? (
                <CalendarDays size={18} />
              ) : (
                <History size={18} />
              )}{" "}
              {path === "/student" ? "통합 마감 캘린더" : "변경 이력"}
            </a>
            <a
              href={path === "/admin" ? "#department-editor" : "#guide"}
              className="side-link"
            >
              <FileCheck2 size={18} />
              {path === "/admin" ? "학과 절차 편집" : "학과 절차 안내"}
            </a>
            {path === "/admin" && (
              <div className="upcoming">
                <div className="sidebar-label">관리 도구</div>
                <a href="#students" className="side-link">
                  <Search size={18} />
                  학생 검색
                </a>
                <a href="#announcements" className="side-link">
                  <Megaphone size={18} />
                  공지사항 작성
                </a>
                {["명단 등록", "명단 내보내기"].map((v) => (
                  <button key={v} disabled>
                    {v}
                    <small>준비 중</small>
                  </button>
                ))}
              </div>
            )}
            <div className="sidebar-bottom">
              <span className="badge">2026-2학기 데모</span>
              <p>
                서로 같은 상태를 보며
                <br />
                다음 단계를 준비하세요.
              </p>
              <Link href="/">
                서비스 소개 <ArrowUpRight size={13} />
              </Link>
            </div>
          </aside>
        )}
        <main id="main" className={isHome ? "" : "main-content"}>
          {isHome || hydrated ? (
            children
          ) : (
            <div className="empty">저장된 진행 상태를 불러오고 있습니다.</div>
          )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </>
  );
}
