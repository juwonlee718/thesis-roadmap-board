"use client";
import { useState } from "react";
import { Users, UserCheck, Clock3 } from "lucide-react";
import { useBoard } from "../lib/store";
import {
  canApprove,
  decideApplication,
  remaining,
  setCapacity,
} from "../lib/rules";
import type {
  Application,
  ApplicationStatus,
  Department,
  Professor,
  Student,
} from "../lib/types";
import {
  Badge,
  DepartmentGuide,
  ErrorMessage,
  HistoryList,
  StatusMessage,
} from "./shared";
import { ProfessorThesis } from "./thesis-file";
export function ProfessorBoard() {
  const { data, professorId, selectProfessor, change } = useBoard();
  const departments = data.departments;
  const p = data.professors.find((p) => p.id === professorId)!;
  const d = departments.find((d) => d.id === p.departmentId)!;
  const applications = data.students.flatMap((s) =>
    s.roadmaps
      .filter((r) => r.application?.professorId === p.id)
      .map((r) => ({ student: s, application: r.application! })),
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">교수 워크스페이스</div>
          <h1>
            학생의 시작을 함께<span className="heading-dot">.</span>
          </h1>
          <p>연구 계획을 검토하고 다음 단계로 이어 주세요.</p>
        </div>
        <label className="user-picker">
          데모 교수
          <select
            aria-label="데모 교수"
            value={p.id}
            onChange={(e) => {
              selectProfessor(e.target.value);
              setError("");
              setMessage("");
            }}
          >
            {data.professors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ·{" "}
                {departments.find((d) => d.id === p.departmentId)?.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="student-meta">
        <span className="avatar">교</span>
        <strong>{p.name}</strong>
        <span>{d.name}</span>
        <Badge tone="amber">예시 데이터</Badge>
      </div>
      <div className="summary-strip">
        <div>
          <Users size={21} />
          <span>지도 정원</span>
          <strong>
            {p.capacity}
            <small>명</small>
          </strong>
        </div>
        <div>
          <UserCheck size={21} />
          <span>{d.usesCapacity ? "배정 / 남은 자리" : "승인·배정 학생"}</span>
          <strong>
            {d.usesCapacity
              ? `${p.assigned} / ${remaining(p)}`
              : applications.filter((a) => a.application.status === "승인")
                  .length}
            <small>명</small>
          </strong>
        </div>
        <div>
          <Clock3 size={21} />
          <span>검토 대기</span>
          <strong>
            {
              applications.filter((a) =>
                ["대기", "면담 요청", "수정 요청"].includes(
                  a.application.status,
                ),
              ).length
            }
            <small>건</small>
          </strong>
        </div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>내 지도 현황</h2>
          <Badge tone={d.usesCapacity && remaining(p) === 0 ? "amber" : ""}>
            {d.usesCapacity && remaining(p) === 0
              ? "정원 마감"
              : d.advisorMethod === "course_assigned"
                ? "수업 배정"
                : "모집 중"}
          </Badge>
        </div>
        <p>
          {p.keywords} · 선호 주제: {p.preferredTopic}
        </p>
        {
          <form
            className="inline-form"
            key={`${p.id}-${p.capacity}`}
            onSubmit={(e) => {
              e.preventDefault();
              const value = Number(
                new FormData(e.currentTarget).get("capacity"),
              );
              try {
                change((state) =>
                  setCapacity(state, departments, p.id, value, {
                    actor: p.name,
                    at: new Date().toISOString(),
                  }),
                );
                setError("");
                setMessage("지도 정원을 저장했습니다.");
              } catch (e) {
                setError((e as Error).message);
                setMessage("");
              }
            }}
          >
            <label>
              지도 정원
              <input
                name="capacity"
                type="number"
                defaultValue={p.capacity}
                min={p.assigned}
                step={1}
                required
                aria-label="지도 정원"
              />
            </label>
            <button className="button secondary">정원 저장</button>
            <small className="muted">
              현재 배정 인원({p.assigned}명)보다 작게 설정할 수 없습니다.
            </small>
          </form>
        }
        <ErrorMessage message={error} />
        <StatusMessage message={message} />
      </section>
      <section id="applications" className="panel">
        <div className="section-heading">
          <h2>지도 신청 목록</h2>
          <Badge>{applications.length}건</Badge>
        </div>
        {d.advisorMethod === "course_assigned" && (
          <p className="alert">
            교수별 졸업논문 수강 정보로 연결된 학생입니다. 별도 배정 절차가
            없습니다.
          </p>
        )}
        {applications.length ? (
          <div className="request-list">
            {applications.map(({ student, application }) => (
              <ApplicationCard
                key={`${p.id}-${student.id}-${application.requestedAt}`}
                student={student}
                application={application}
                professor={p}
                department={d}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            접수된 신청이 없습니다. 학생 화면에서 지도교수 요청을 보내면
            표시됩니다.
          </div>
        )}
      </section>
      <section id="theses" className="panel">
        <div className="section-heading">
          <h2>최종논문 심사</h2>
          <Badge>
            {
              applications.filter(
                ({ student }) =>
                  student.roadmaps.find((r) => r.departmentId === d.id)?.thesis
                    ?.versions.length,
              ).length
            }
            명
          </Badge>
        </div>
        {applications.some(
          ({ student }) =>
            student.roadmaps.find((r) => r.departmentId === d.id)?.thesis
              ?.versions.length,
        ) ? (
          applications.map(({ student }) => {
            const roadmap = student.roadmaps.find(
              (r) => r.departmentId === d.id,
            )!;
            return roadmap.thesis?.versions.length ? (
              <ProfessorThesis
                key={`${p.id}-${student.id}`}
                student={student}
                department={d}
                roadmap={roadmap}
                professor={p}
              />
            ) : null;
          })
        ) : (
          <p className="empty">
            담당 학생이 최종논문을 제출하면 파일과 심사 기능이 표시됩니다.
          </p>
        )}
      </section>
      <HistoryList
        events={data.history.filter((h) => h.departmentId === d.id)}
        students={data.students}
      />
      <section className="panel" id="guide">
        <DepartmentGuide department={d} />
      </section>
    </>
  );
}
function ApplicationCard({
  student: s,
  application: a,
  professor: p,
  department: d,
}: {
  student: Student;
  application: Application;
  professor: Professor;
  department: Department;
}) {
  const change = useBoard((s) => s.change);
  const departments = useBoard((s) => s.data.departments);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const decide = (status: Exclude<ApplicationStatus, "대기">) => {
    try {
      change((state) =>
        decideApplication(
          state,
          departments,
          s.id,
          d.id,
          p.id,
          status,
          feedback,
          { actor: p.name, at: new Date().toISOString() },
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <article className="request-card" data-testid={`application-${s.id}`}>
      <div className="section-heading">
        <h3>
          {s.name}
          <small>{s.number}</small>
        </h3>
        <Badge tone={a.status === "승인" ? "" : "amber"}>{a.status}</Badge>
      </div>
      <p className="muted">
        {s.majors
          .map(
            (m) =>
              `${departments.find((d) => d.id === m.departmentId)?.name} ${m.type === "primary" ? "주전공" : "복수전공"}`,
          )
          .join(" · ")}{" "}
        · {s.graduation} 졸업 예정
      </p>
      <dl className="detail-grid">
        <div>
          <dt>연구 주제</dt>
          <dd>{a.topic}</dd>
        </div>
        <div>
          <dt>신청일</dt>
          <dd>{a.requestedAt.slice(0, 10)}</dd>
        </div>
        <div className="wide">
          <dt>연구계획</dt>
          <dd>{a.plan}</dd>
        </div>
      </dl>
      {d.advisorMethod !== "course_assigned" &&
        ["대기", "면담 요청", "수정 요청"].includes(a.status) && (
          <>
            {a.status === "면담 요청" && (
              <p className="alert">
                면담 후 이 신청에서 계속 검토할 수 있습니다. 승인하거나 수정
                요청·반려 사유를 전달하세요.
              </p>
            )}
            <label>
              학생에게 전달할 피드백
              <textarea
                aria-label={`${s.name} 피드백`}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="수정 요청·면담 요청·반려 시 반드시 입력해 주세요"
              />
            </label>
            <ErrorMessage message={error} />
            <div className="action-row">
              <button
                className="button primary"
                disabled={!canApprove(d, p)}
                onClick={() => decide("승인")}
              >
                승인
              </button>
              {(["수정 요청", "면담 요청", "반려"] as const).map((status) => (
                <button
                  className={`button ${status === "반려" ? "danger" : "secondary"}`}
                  key={status}
                  onClick={() => decide(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            {!canApprove(d, p) && (
              <p className="capacity-warning">
                정원 마감 · 남은 자리가 없어 승인할 수 없습니다.
              </p>
            )}
          </>
        )}
      {a.feedback && (
        <div className="feedback">
          <strong>전달한 피드백</strong>
          <p>{a.feedback}</p>
        </div>
      )}
      {a.status === "승인" && (
        <p className="confirmation">지도교수 확정 완료</p>
      )}
    </article>
  );
}
