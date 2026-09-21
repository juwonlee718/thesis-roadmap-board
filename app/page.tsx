import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers3,
  CheckCheck,
} from "lucide-react";
export default function Home() {
  return (
    <div className="landing">
      <div className="eyebrow">
        <span className="live-dot" /> 샤논과 함께, 졸업까지 한 단계씩
      </div>
      <h1>
        전공은 달라도,
        <br />
        논문을 향한 길은 <em>한눈에.</em>
      </h1>
      <p className="hero-copy">
        학과마다 다른 절차, 흩어진 승인 요청, 겹치는 마감.
        <br />
        나의 다음 할 일을 찾고, 같은 진행 상태로 함께 나아가세요.
      </p>
      <div className="hero-road">
        <span>
          <i>01</i> 전공별 절차 확인
        </span>
        <ArrowRight size={18} />
        <span>
          <i>02</i> 지도 상담과 승인
        </span>
        <ArrowRight size={18} />
        <span>
          <i>03</i> 논문 제출과 심사
        </span>
        <CheckCheck size={22} />
      </div>
      <div className="section-heading">
        <h2>어떤 역할로 시작할까요?</h2>
        <span className="muted">로그인 없이 체험할 수 있어요</span>
      </div>
      <div className="role-cards">
        {[
          {
            href: "/student",
            icon: GraduationCap,
            title: "학생",
            desc: "내 전공의 절차와 다음 할 일",
            text: "전공별 로드맵과 통합 마감 캘린더로 지금 해야 할 일을 확인하세요.",
          },
          {
            href: "/professor",
            icon: BookOpen,
            title: "교수",
            desc: "지도 상담부터 논문 심사까지",
            text: "연구 계획과 면담 요청을 이어서 검토하고, 제출된 논문에 피드백을 전달하세요.",
          },
          {
            href: "/admin",
            icon: Layers3,
            title: "행정실",
            desc: "학과 절차 관리와 학생 현황",
            text: "학과 절차와 마감을 편집하고 공지를 전하세요. 졸업 대상 학생의 진행 상황도 검색할 수 있어요.",
          },
        ].map(({ icon: Icon, ...r }) => (
          <Link className="role-card" href={r.href} key={r.href}>
            <div className="role-icon">
              <Icon size={26} />
            </div>
            <h3>{r.title}</h3>
            <strong>{r.desc}</strong>
            <p>{r.text}</p>
            <span className="role-cta">
              {r.title}
              {r.title === "교수" ? "로" : "으로"} 시작 <ArrowRight size={17} />
            </span>
          </Link>
        ))}
      </div>
      <div className="demo-note">
        <span className="badge amber">예시 데이터</span>
        <p>
          모든 학과 절차·일정·인물은 가상입니다. 이 데모의 상태는 현재
          브라우저에만 저장됩니다.
        </p>
      </div>
    </div>
  );
}
