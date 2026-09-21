"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  Flag,
  Layers3,
} from "lucide-react";
import { useBoard } from "../lib/store";
import {
  calendarEvents,
  canApply,
  configureMajors,
  info,
  methodLabels,
  nextTask,
  overlappingWeeks,
  recordStage,
  remaining,
  requestAdvisor,
  saveResearchDraft,
} from "../lib/rules";
import type { Department, Roadmap, Student } from "../lib/types";
import {
  Badge,
  DepartmentGuide,
  ErrorMessage,
  OfficialLink,
  StageDetails,
  StatusMessage,
} from "./shared";
import { StudentThesis } from "./thesis-file";
export function StudentBoard() {
  const { data, studentId, selectStudent } = useBoard();
  const s = data.students.find((s) => s.id === studentId)!;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">학생 워크스페이스</div>
          <h1>
            나의 논문 여정<span className="heading-dot">.</span>
          </h1>
          <p>전공별로 다른 과정, 지금 필요한 일부터 확인하세요.</p>
        </div>
        <label className="user-picker">
          데모 학생
          <select
            aria-label="데모 학생"
            value={studentId}
            onChange={(e) => selectStudent(e.target.value)}
          >
            {data.students.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
                {s.id === data.students[0].id ? " · 대표 시연" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="student-meta">
        <span className="avatar">학</span>
        <strong>{s.name}</strong>
        <span>{s.number}</span>
        <span>{s.graduation} 졸업 예정</span>
        <Badge>졸업논문 대상</Badge>
      </div>
      {!s.configured ? (
        <MajorSetup key={s.id} student={s} />
      ) : (
        <StudentJourney key={s.id} student={s} />
      )}
    </>
  );
}
function MajorSetup({ student: s }: { student: Student }) {
  const departments = useBoard((s) => s.data.departments);
  const change = useBoard((s) => s.change);
  const [primary, setPrimary] = useState(
    s.majors.find((m) => m.type === "primary")?.departmentId ??
      departments[0].id,
  );
  const [secondary, setSecondary] = useState<string[]>(
    s.majors.filter((m) => m.type === "secondary").map((m) => m.departmentId),
  );
  const [error, setError] = useState("");
  return (
    <section className="panel setup">
      <div className="role-icon">
        <Layers3 />
      </div>
      <Badge>첫 단계 · 전공 설정</Badge>
      <h2>어떤 전공으로 졸업을 준비하나요?</h2>
      <p>전공별 논문 요건을 확인하고 나만의 로드맵을 만들어 드려요.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            change((state) =>
              configureMajors(
                state,
                departments,
                s.id,
                [
                  { departmentId: primary, type: "primary" },
                  ...secondary
                    .filter((id) => id !== primary)
                    .map((departmentId) => ({
                      departmentId,
                      type: "secondary" as const,
                    })),
                ],
                { actor: s.name, at: new Date().toISOString() },
              ),
            );
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          주전공
          <select
            aria-label="주전공"
            value={primary}
            onChange={(e) => {
              setPrimary(e.target.value);
              setSecondary(secondary.filter((id) => id !== e.target.value));
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>
            복수전공 <span className="muted">복수 선택 가능</span>
          </legend>
          {departments
            .filter((d) => d.id !== primary)
            .map((d) => (
              <label className="check-option" key={d.id}>
                <input
                  type="checkbox"
                  checked={secondary.includes(d.id)}
                  onChange={(e) =>
                    setSecondary(
                      e.target.checked
                        ? [...secondary, d.id]
                        : secondary.filter((id) => id !== d.id),
                    )
                  }
                />
                {d.name}
                <Badge tone={d.requirements.secondary === "면제" ? "" : "blue"}>
                  논문 {info(d.requirements.secondary)}
                </Badge>
              </label>
            ))}
        </fieldset>
        <ErrorMessage message={error} />
        <button className="button primary" type="submit">
          내 로드맵 만들기 <ArrowRight size={16} />
        </button>
      </form>
      <small className="muted">
        전공 설정 후 진행 상태가 저장됩니다. 전공을 다시 설정하려면 데모를
        초기화하세요.
      </small>
    </section>
  );
}
function StudentJourney({ student: s }: { student: Student }) {
  const { departments, announcements } = useBoard((s) => s.data);
  const [selected, setSelected] = useState(
    s.roadmaps[0]?.departmentId ?? s.majors[0].departmentId,
  );
  const task = nextTask(s, departments);
  const conflicts = overlappingWeeks(s, departments);
  const r = s.roadmaps.find((r) => r.departmentId === selected);
  const d = departments.find((d) => d.id === selected)!;
  const done = s.roadmaps.reduce((n, r) => n + r.completed.length, 0);
  const total = s.roadmaps.reduce(
    (n, r) =>
      n +
      (departments.find((d) => d.id === r.departmentId)?.stages.length ?? 0),
    0,
  );
  return (
    <>
      <section className="next-card" data-testid="next-task">
        <div>
          <div className="next-label">
            <span className="live-dot" />
            가장 먼저 확인할 일
          </div>
          <h2>
            {task
              ? `${task.correction ? "보완 요청 확인 · " : ""}${task.stage.name}`
              : "모든 절차를 완료했어요"}
          </h2>
          <p>
            {task
              ? task.stage.description
              : "전공별 완료 상태와 기록을 확인할 수 있습니다."}
          </p>
          <div className="next-meta">
            {task && (
              <>
                <span>{task.department.name}</span>
                <span>
                  <CalendarDays size={14} />
                  {info(task.stage.deadline)}까지
                </span>
                <span>{task.stage.submission}</span>
              </>
            )}
          </div>
        </div>
        <a
          className="next-action"
          href="#roadmap"
          onClick={() => task && setSelected(task.department.id)}
        >
          지금 확인하기 <ArrowUpRight size={17} />
        </a>
      </section>
      <div className="summary-strip">
        <div>
          <Layers3 size={20} />
          <span>진행 중인 전공</span>
          <strong>
            {s.roadmaps.length}
            <small>개</small>
          </strong>
        </div>
        <div>
          <Check size={20} />
          <span>완료한 단계</span>
          <strong>
            {done}
            <small> / {total}</small>
          </strong>
        </div>
        <div>
          <Flag size={20} />
          <span>마감 겹침</span>
          <strong>
            {conflicts.length}
            <small>주</small>
          </strong>
        </div>
      </div>
      <div className="student-columns">
        <div className="roadmap-column">
          <section id="roadmap" className="panel">
            <div className="section-heading">
              <h2>전공별 로드맵</h2>
              <span className="muted">나의 진행 단계</span>
            </div>
            <div
              className="major-tabs"
              role="tablist"
              aria-label="전공별 로드맵"
            >
              {s.majors.map((m) => {
                const md = departments.find((d) => d.id === m.departmentId)!;
                return (
                  <button
                    role="tab"
                    aria-selected={selected === md.id}
                    key={md.id}
                    style={
                      { "--department-color": md.color } as React.CSSProperties
                    }
                    onClick={() => setSelected(md.id)}
                  >
                    {md.name}
                    <small>
                      {m.type === "primary" ? "주전공" : "복수전공"}
                      {md.requirements[m.type] === "면제" ? " · 면제" : ""}
                    </small>
                  </button>
                );
              })}
            </div>
            {r ? (
              <RoadmapView key={d.id} student={s} department={d} roadmap={r} />
            ) : (
              <div className="empty">
                <h3>
                  {d.requirements[
                    s.majors.find((m) => m.departmentId === d.id)!.type
                  ] === "면제"
                    ? "졸업논문 면제 전공입니다"
                    : "정보 확인 필요"}
                </h3>
                <p>현재 전공 요건에 따라 별도 로드맵이 생성되지 않았습니다.</p>
              </div>
            )}
          </section>
          <section id="guide" className="panel">
            <DepartmentGuide department={d} />
          </section>
          <section id="announcements" className="panel">
            <div className="section-heading">
              <h2>내 전공 공지사항</h2>
            </div>
            {announcements.filter((a) =>
              s.majors.some((m) => m.departmentId === a.departmentId),
            ).length ? (
              announcements
                .filter((a) =>
                  s.majors.some((m) => m.departmentId === a.departmentId),
                )
                .map((a) => (
                  <article className="request-card" key={a.id}>
                    <Badge tone="blue">
                      {
                        departments.find(
                          (department) => department.id === a.departmentId,
                        )?.name
                      }
                    </Badge>
                    <h3>{a.title}</h3>
                    <p style={{ whiteSpace: "pre-wrap" }}>{a.body}</p>
                    <small className="muted">
                      {a.createdAt.slice(0, 10)} · {a.author}
                    </small>
                  </article>
                ))
            ) : (
              <p className="muted">등록된 전공 공지사항이 없습니다.</p>
            )}
          </section>
        </div>
        <aside className="calendar-column">
          <DeadlineCalendar student={s} />
          <section className="tip-card">
            <span className="eyebrow">함께 확인하는 진행 상태</span>
            <h3>승인이 끝나면, 다음 단계로.</h3>
            <p>
              이곳에서 연구 계획을 보내고 교수와 면담·수정을 진행하세요. 교수
              승인과 최종논문 심사 결과가 로드맵에 바로 반영됩니다.
            </p>
            <Badge tone="amber">예시 데이터</Badge>
            <p className="small">실제 서류·일정은 학과 공지를 확인하세요.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
function RoadmapView({
  student: s,
  department: d,
  roadmap: r,
}: {
  student: Student;
  department: Department;
  roadmap: Roadmap;
}) {
  const { data, change } = useBoard();
  const departments = data.departments;
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const current = d.stages[r.currentStage];
  const app = r.application;
  const professor = data.professors.find((p) => p.id === app?.professorId);
  const run = (fn: Parameters<typeof change>[0], msg: string) => {
    try {
      change(fn);
      setError("");
      setMessage(msg);
    } catch (e) {
      setError((e as Error).message);
      setMessage("");
    }
  };
  return (
    <div data-testid={`roadmap-${d.id}`}>
      <div className="roadmap-summary">
        <div>
          <span>지도교수 결정 방식</span>
          <strong>{methodLabels[d.advisorMethod]}</strong>
        </div>
        <div>
          <span>다음 마감</span>
          <strong>{current ? info(current.deadline) : "모든 단계 완료"}</strong>
        </div>
        <div>
          <span>제출 방법</span>
          <strong>{current?.submission ?? "완료"}</strong>
        </div>
        <div>
          <span>공식 링크</span>
          <strong>
            <OfficialLink value={d.officialLink} />
          </strong>
        </div>
      </div>
      <div className="current-stage" data-testid="current-stage">
        <span className="muted">현재 단계</span>
        <strong>{current?.name ?? "전체 완료"}</strong>
        {d.source !== "실제 공지" && <Badge tone="amber">예시 데이터</Badge>}
      </div>
      <ol className="timeline">
        {d.stages.map((stage, index) => {
          const completed = r.completed.includes(stage.id);
          const active = index === r.currentStage;
          return (
            <li
              key={stage.id}
              className={`${completed ? "completed" : ""} ${active ? "current" : ""}`}
            >
              <span className="step-dot">
                {completed ? (
                  <Check size={15} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <details open={active}>
                <summary>
                  <span className="stage-title">
                    {stage.name}
                    <small>
                      {info(stage.deadline)} · {stage.submission}
                    </small>
                  </span>
                  <Badge tone={completed ? "" : active ? "blue" : "neutral"}>
                    {completed ? "완료" : active ? "진행 중" : "예정"}
                  </Badge>
                </summary>
                <StageDetails stage={stage} />
                {active &&
                  stage.kind !== "advisor" &&
                  stage.kind !== "result" &&
                  stage.kind !== "thesis" && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        run(
                          (state) =>
                            recordStage(state, departments, s.id, d.id, false, {
                              actor: s.name,
                              at: new Date().toISOString(),
                            }),
                          "제출 상태를 기록했습니다.",
                        )
                      }
                    >
                      {stage.kind === "course"
                        ? "수강 완료 기록"
                        : "제출 완료 기록"}
                    </button>
                  )}
                {active && stage.kind === "result" && (
                  <p className="muted">
                    지도교수의 최종논문 심사 결과가 반영되는 단계입니다.
                  </p>
                )}
              </details>
            </li>
          );
        })}
      </ol>
      <ErrorMessage message={error} />
      <StatusMessage message={message} />
      {d.stages.some((stage) => stage.kind === "thesis") && (
        <StudentThesis student={s} department={d} roadmap={r} />
      )}
      <div id="advisor" className="advisor-section">
        <div className="section-heading">
          <h3>지도교수 신청·진행</h3>
          {app && (
            <Badge tone={app.status === "승인" ? "" : "amber"}>
              {app.status}
            </Badge>
          )}
        </div>
        {app && (
          <div className="application-state">
            <strong>{professor?.name}</strong>
            <span> · {professor?.keywords}</span>
            <p>{app.topic}</p>
            <small>신청·배정일 {app.requestedAt.slice(0, 10)}</small>
            {app.status === "승인" && (
              <p className="confirmation" data-testid="confirmation">
                지도교수 확정 완료
              </p>
            )}
            {app.feedback && (
              <div className="feedback" role="status">
                <strong>교수 피드백</strong>
                <p>{app.feedback}</p>
              </div>
            )}
          </div>
        )}
        {d.advisorMethod === "course_assigned" ? (
          <p className="muted">
            교수별 졸업논문 수강 정보로 지도교수가 자동 연결됩니다.{" "}
            {app
              ? s.courseEnrollments.find(
                  (enrollment) => enrollment.departmentId === d.id,
                )?.courseName
              : "등록된 수강 정보가 없습니다. 학과 담당자에게 수강 정보를 확인하세요."}
          </p>
        ) : !app || !["승인", "대기", "면담 요청"].includes(app.status) ? (
          <AdvisorForm student={s} department={d} />
        ) : (
          <p className="muted">
            {app.status === "대기"
              ? "교수의 검토를 기다리고 있습니다. 결과와 피드백이 이곳에 표시됩니다."
              : app.status === "면담 요청"
                ? "교수 피드백에 따라 면담을 진행하세요. 면담 후 교수가 이 신청에서 승인·수정 요청·반려를 처리합니다."
                : "교수 승인 기록이 서명·이메일 증빙을 대체합니다."}
          </p>
        )}
      </div>
    </div>
  );
}
function AdvisorForm({
  student: s,
  department: d,
}: {
  student: Student;
  department: Department;
}) {
  const { data, change } = useBoard();
  const departments = data.departments;
  const roadmap = s.roadmaps.find((r) => r.departmentId === d.id)!;
  const [topic, setTopic] = useState(
    roadmap.draft?.topic ?? roadmap.application?.topic ?? "",
  );
  const [plan, setPlan] = useState(
    roadmap.draft?.plan ?? roadmap.application?.plan ?? "",
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div>
      <label>
        연구 주제
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="탐구하고 싶은 주제를 적어 주세요"
        />
      </label>
      <label>
        간단한 연구계획
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="연구 질문과 방법, 계획을 적어 주세요"
        />
      </label>
      <div className="action-row">
        <button
          className="button secondary"
          onClick={() => {
            try {
              change((state) =>
                saveResearchDraft(
                  state,
                  state.departments,
                  s.id,
                  d.id,
                  { topic, plan },
                  { actor: s.name, at: new Date().toISOString() },
                ),
              );
              setError("");
              setMessage("연구 주제와 계획을 초안으로 저장했습니다.");
            } catch (e) {
              setError((e as Error).message);
              setMessage("");
            }
          }}
        >
          연구계획 초안 저장
        </button>
      </div>
      <p className="muted small">
        교수를 선택하기 전에도 초안을 저장할 수 있어요. 준비되면 아래 교수에게
        지도 요청을 보내세요. 면담과 승인 결과를 이 화면에서 확인합니다.
      </p>
      <ErrorMessage message={error} />
      <StatusMessage message={message} />
      <div className="professor-options">
        {data.professors
          .filter((p) => p.departmentId === d.id)
          .map((p) => (
            <article className="professor-option" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p>{p.keywords}</p>
                <small>선호 주제: {p.preferredTopic}</small>
                <p>
                  {d.usesCapacity
                    ? `정원 ${p.capacity}명 · 배정 ${p.assigned}명 · 남은 자리 ${remaining(p)}명`
                    : "정원 제한 없음"}
                </p>
              </div>
              <button
                className="button secondary"
                aria-label={`${p.name} ${canApply(d, p) ? "지도 요청" : "정원 마감"}`}
                disabled={!canApply(d, p)}
                onClick={() => {
                  try {
                    change((state) =>
                      requestAdvisor(
                        state,
                        departments,
                        s.id,
                        d.id,
                        p.id,
                        { topic, plan },
                        { actor: s.name, at: new Date().toISOString() },
                      ),
                    );
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {canApply(d, p) ? "지도 요청" : "정원 마감"}
                <ArrowRight size={14} />
              </button>
            </article>
          ))}
      </div>
    </div>
  );
}
function DeadlineCalendar({ student }: { student: Student }) {
  const departments = useBoard((s) => s.data.departments);
  const events = calendarEvents(student, departments);
  const datedEvents = events.filter((e) =>
    /^\d{4}-\d{2}-\d{2}$/.test(e.stage.deadline),
  );
  const firstMonth =
    datedEvents[0]?.stage.deadline.slice(0, 7) ??
    new Date().toISOString().slice(0, 7);
  const lastMonth =
    datedEvents.at(-1)?.stage.deadline.slice(0, 7) ?? firstMonth;
  const [selectedMonth, setSelectedMonth] = useState(firstMonth);
  const visibleMonth =
    selectedMonth < firstMonth
      ? firstMonth
      : selectedMonth > lastMonth
        ? lastMonth
        : selectedMonth;
  const [year, month] = visibleMonth.split("-").map(Number);
  const moveMonth = (delta: number) =>
    setSelectedMonth(
      new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7),
    );
  const conflicts = overlappingWeeks(student, departments);
  const start = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const shown = events.filter((e) => e.stage.deadline.startsWith(visibleMonth));
  return (
    <section className="panel calendar-panel" id="calendar">
      <div className="section-heading">
        <h2>통합 마감 캘린더</h2>
        <CalendarDays size={18} />
      </div>
      <div className="calendar-legend">
        {student.roadmaps.map((r) => {
          const d = departments.find((d) => d.id === r.departmentId)!;
          return (
            <span key={d.id}>
              <i style={{ background: d.color }} />
              {d.name}
            </span>
          );
        })}
      </div>
      <div className="calendar-nav">
        <button
          aria-label="이전 달"
          disabled={visibleMonth <= firstMonth}
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <strong>
          {year}년 {month}월
        </strong>
        <button
          aria-label="다음 달"
          disabled={visibleMonth >= lastMonth}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendar-grid">
        {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
          <span className="weekday" key={w}>
            {w}
          </span>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={`empty${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const todayEvents = shown.filter(
            (e) => Number(e.stage.deadline.slice(-2)) === day,
          );
          return (
            <div
              className={`calendar-day ${todayEvents.length ? "has-event" : ""}`}
              key={day}
              aria-label={`${month}월 ${day}일 ${todayEvents.map((e) => `${e.department.name} ${e.stage.name}`).join(", ")}`}
            >
              <span>{day}</span>
              <div>
                {todayEvents.map((e) => (
                  <i
                    key={e.department.id + e.stage.id}
                    style={{ background: e.department.color }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="deadline-list">
        {shown.map((e) => (
          <div
            key={e.department.id + e.stage.id}
            className="deadline-row"
            style={{ borderLeftColor: e.department.color }}
          >
            <span className="deadline-date">
              {Number(e.stage.deadline.slice(-2))}
              <small>{month}월</small>
            </span>
            <div>
              <strong>{e.stage.name}</strong>
              <small>
                {e.department.name} · {e.completed ? "완료" : "미완료"}
              </small>
            </div>
            {e.completed ? <Check size={14} /> : <Circle size={10} />}
          </div>
        ))}
        {!shown.length && <p className="empty">이번 달 마감이 없습니다.</p>}
      </div>
      {conflicts.length > 0 && (
        <div className="overlap-warning">
          <strong>마감이 겹치는 주가 있어요</strong>
          {conflicts.map((c) => (
            <p key={c.week}>
              {c.week} 시작 주<br />
              {c.names.join(" · ")}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
