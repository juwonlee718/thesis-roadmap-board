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
        <span className="live-dot" /> 졸업까지, 한 단계씩
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
          <i>02</i> 지도교수 승인
        </span>
        <ArrowRight size={18} />
        <span>
          <i>03</i> 행정실 확정 검토
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
            desc: "지도 신청 검토와 승인",
            text: "학생의 연구 계획을 검토하고 피드백과 승인 결과를 바로 전달하세요.",
          },
          {
            href: "/admin",
            icon: Layers3,
            title: "행정실",
            desc: "학과 전체의 진행 현황",
            text: "미확정 학생을 확인하고, 교수 승인 건의 확정 검토와 수업 배정을 진행하세요.",
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
