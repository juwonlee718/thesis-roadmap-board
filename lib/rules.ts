import type {
  ApplicationStatus,
  BoardState,
  ChangeContext,
  Department,
  Major,
  Professor,
  ReviewStatus,
  Roadmap,
  Student,
} from "./types";

export const methodLabels = {
  contact_approval: "직접 컨택 후 승인",
  application: "시스템 신청 · 정원 적용",
  course_assigned: "전공 수업에서 배정",
};
export const info = (value: string | undefined | null) =>
  value?.trim() || "정보 확인 필요";
export function validateDepartments(departments: Department[]): string[] {
  return departments.flatMap((d) => [
    ...(["primary", "secondary"] as const)
      .filter((k) => !["필수", "면제"].includes(d.requirements[k]))
      .map((k) => `${d.id}: ${k} 요건 누락`),
    ...(!d.officialLink?.trim() ? [`${d.id}: 공식 링크 누락`] : []),
    ...d.stages
      .filter(
        (s) =>
          !s.deadline ||
          !/^2026-(09|10|11|12)-\d{2}$/.test(s.deadline) ||
          Number.isNaN(Date.parse(s.deadline)),
      )
      .map((s) => `${d.id}/${s.id}: 마감일 누락 또는 오류`),
  ]);
}
export function generateRoadmaps(
  majors: Major[],
  departments: Department[],
): Roadmap[] {
  if (majors.filter((m) => m.type === "primary").length !== 1)
    throw new Error("주전공을 하나 선택해 주세요.");
  if (new Set(majors.map((m) => m.departmentId)).size !== majors.length)
    throw new Error("같은 전공을 중복 선택할 수 없습니다.");
  return majors.flatMap((m) => {
    const d = departments.find((d) => d.id === m.departmentId);
    if (!d) throw new Error("학과 정보를 찾을 수 없습니다.");
    return d.requirements[m.type] === "필수"
      ? [{ departmentId: d.id, currentStage: 0, completed: [], submitted: [] }]
      : [];
  });
}
export function remaining(p: Professor) {
  return p.capacity - p.assigned;
}
export function canApply(d: Department, p: Professor): boolean {
  return (
    p.departmentId === d.id &&
    d.advisorMethod !== "course_assigned" &&
    (!d.usesCapacity || remaining(p) > 0)
  );
}
export function canApprove(d: Department, p: Professor) {
  return canApply(d, p);
}
export function canSetCapacity(p: Professor, value: number) {
  return Number.isInteger(value) && value >= p.assigned && value >= 0;
}
export function nextTask(student: Student, departments: Department[]) {
  return student.roadmaps
    .flatMap((r) => {
      const d = departments.find((d) => d.id === r.departmentId);
      if (!d) return [];
      const correction = r.application?.review === "보완 요청";
      const stage = correction
        ? d.stages.find((s) => s.kind === "advisor")
        : d.stages[r.currentStage];
      return stage ? [{ department: d, stage, correction }] : [];
    })
    .sort((a, b) =>
      (a.stage.deadline || "0000").localeCompare(b.stage.deadline || "0000"),
    )[0];
}
export function calendarEvents(student: Student, departments: Department[]) {
  return student.roadmaps
    .flatMap((r) => {
      const d = departments.find((d) => d.id === r.departmentId);
      return d
        ? d.stages.map((s) => ({
            department: d,
            stage: s,
            completed: r.completed.includes(s.id),
            submitted: r.submitted.includes(s.id),
          }))
        : [];
    })
    .sort((a, b) => a.stage.deadline.localeCompare(b.stage.deadline));
}
export function overlappingWeeks(student: Student, departments: Department[]) {
  const weeks = new Map<string, Set<string>>();
  for (const event of calendarEvents(student, departments).filter(
    (e) => !e.completed && e.stage.deadline,
  )) {
    const date = new Date(event.stage.deadline + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = date.toISOString().slice(0, 10);
    weeks.set(key, new Set([...(weeks.get(key) ?? []), event.department.name]));
  }
  return [...weeks]
    .filter(([, names]) => names.size > 1)
    .map(([week, names]) => ({ week, names: [...names] }));
}
function target(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
) {
  const student = state.students.find((s) => s.id === studentId);
  const roadmap = student?.roadmaps.find(
    (r) => r.departmentId === departmentId,
  );
  const department = ds.find((d) => d.id === departmentId);
  if (!student || !roadmap || !department)
    throw new Error("학생 전공 정보를 확인해 주세요.");
  return { student, roadmap, department };
}
function log(
  state: BoardState,
  ctx: ChangeContext,
  content: string,
  studentId?: string,
  departmentId?: string,
) {
  state.history.unshift({
    id: `${ctx.at}-${state.history.length}`,
    ...ctx,
    content,
    studentId,
    departmentId,
  });
  return state;
}
export function configureMajors(
  state: BoardState,
  ds: Department[],
  studentId: string,
  majors: Major[],
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const s = next.students.find((s) => s.id === studentId);
  if (!s) throw new Error("학생을 찾을 수 없습니다.");
  if (s.configured)
    throw new Error("진행 중인 전공은 데모 초기화 후 다시 설정할 수 있습니다.");
  s.roadmaps = generateRoadmaps(majors, ds);
  s.majors = majors;
  s.configured = true;
  return log(next, ctx, "전공 설정 및 전공별 로드맵 생성", studentId);
}
export function requestAdvisor(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  professorId: string,
  input: { topic: string; plan: string; contacted: boolean },
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  const p = next.professors.find((p) => p.id === professorId);
  if (!p || !canApply(d, p))
    throw new Error("신청할 수 없습니다. 정원 또는 배정 방식을 확인해 주세요.");
  if (r.application && ["대기", "승인"].includes(r.application.status))
    throw new Error("이미 처리 중이거나 승인된 신청입니다.");
  if (d.advisorMethod === "contact_approval" && !input.contacted)
    throw new Error("교수 컨택 완료를 먼저 기록해 주세요.");
  if (!input.topic.trim() || !input.plan.trim())
    throw new Error("연구 주제와 계획을 입력해 주세요.");
  r.application = {
    professorId,
    topic: input.topic.trim(),
    plan: input.plan.trim(),
    contacted: input.contacted,
    requestedAt: ctx.at,
    status: "대기",
    feedback: "",
    review: "검토 대기",
    reviewFeedback: "",
  };
  return log(
    next,
    ctx,
    `${d.name} · ${p.name}에게 지도교수 승인 요청${input.contacted ? " (컨택 완료 기록)" : ""}`,
    studentId,
    departmentId,
  );
}
export function decideApplication(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  professorId: string,
  status: Exclude<ApplicationStatus, "대기">,
  feedback: string,
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  const a = r.application;
  const p = next.professors.find((p) => p.id === professorId);
  if (
    !a ||
    !p ||
    a.professorId !== p.id ||
    a.status !== "대기" ||
    d.advisorMethod === "course_assigned"
  )
    throw new Error("대기 중인 본인 신청만 처리할 수 있습니다.");
  if (status !== "승인" && !feedback.trim())
    throw new Error("학생에게 전달할 피드백을 입력해 주세요.");
  if (status === "승인") {
    if (!canApprove(d, p))
      throw new Error("남은 자리가 없어 승인할 수 없습니다.");
    if (d.usesCapacity) p.assigned += 1;
    r.currentStage = Math.max(
      r.currentStage,
      d.stages.findIndex((s) => s.kind === "advisor") + 1,
    );
  }
  a.status = status;
  a.feedback = feedback.trim();
  return log(
    next,
    ctx,
    `${d.name} · ${status}${feedback.trim() ? `: ${feedback.trim()}` : ""}`,
    studentId,
    departmentId,
  );
}
export function reviewConfirmation(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  status: Exclude<ReviewStatus, "검토 대기">,
  feedback: string,
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  if (
    !r.application ||
    r.application.status !== "승인" ||
    r.application.review === "검토 완료"
  )
    throw new Error("확정 전 교수 승인 건만 검토할 수 있습니다.");
  if (status === "보완 요청" && !feedback.trim())
    throw new Error("학생에게 전달할 피드백을 입력해 주세요.");
  r.application.review = status;
  r.application.reviewFeedback = feedback.trim();
  if (status === "검토 완료") {
    const stage = d.stages.find((s) => s.kind === "advisor");
    if (stage && !r.completed.includes(stage.id)) r.completed.push(stage.id);
  }
  return log(
    next,
    ctx,
    `${d.name} · 확정 ${status}${feedback.trim() ? `: ${feedback.trim()}` : ""}`,
    studentId,
    departmentId,
  );
}
export function resubmitReview(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  response: string,
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  if (r.application?.review !== "보완 요청" || !response.trim())
    throw new Error("보완 내용을 입력해 주세요.");
  r.application.review = "검토 대기";
  return log(
    next,
    ctx,
    `${d.name} · 보완 후 재검토 요청: ${response.trim()}`,
    studentId,
    departmentId,
  );
}
export function setCapacity(
  state: BoardState,
  ds: Department[],
  professorId: string,
  capacity: number,
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const p = next.professors.find((p) => p.id === professorId);
  if (
    !p ||
    !ds.find((d) => d.id === p.departmentId)?.usesCapacity ||
    !canSetCapacity(p, capacity)
  )
    throw new Error("정원은 배정 인원 이상의 정수여야 합니다.");
  p.capacity = capacity;
  return log(
    next,
    ctx,
    `${p.name} · 지도 정원을 ${capacity}명으로 변경`,
    undefined,
    p.departmentId,
  );
}
export function assignAdvisor(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  professorId: string,
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  const p = next.professors.find((p) => p.id === professorId);
  if (
    d.advisorMethod !== "course_assigned" ||
    !p ||
    p.departmentId !== d.id ||
    r.application
  )
    throw new Error("수업 배정 대상 및 소속 교수를 확인해 주세요.");
  const index = d.stages.findIndex((s) => s.kind === "advisor");
  r.completed = [
    ...new Set([
      ...r.completed,
      ...d.stages.slice(0, index + 1).map((s) => s.id),
    ]),
  ];
  r.currentStage = index + 1;
  r.application = {
    professorId,
    status: "승인",
    feedback: "수업 배정 결과가 등록되었습니다.",
    contacted: false,
    topic: "수업 내 연구 주제",
    plan: "수업 담당자 안내에 따릅니다.",
    requestedAt: ctx.at,
    review: "검토 완료",
    reviewFeedback: "",
  };
  return log(
    next,
    ctx,
    `${d.name} · ${p.name} 수업 지도교수 배정 및 수강 확인`,
    studentId,
    departmentId,
  );
}
export function recordStage(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  byAdmin: boolean,
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  const stage = d.stages[r.currentStage];
  if (
    !stage ||
    stage.kind === "advisor" ||
    (stage.kind === "result" && !byAdmin)
  )
    throw new Error("이 단계는 담당자의 확인이 필요합니다.");
  if (stage.kind === "result" && r.application?.review !== "검토 완료")
    throw new Error("지도교수 확정 검토를 먼저 완료해 주세요.");
  if (r.application?.review === "보완 요청")
    throw new Error("행정실 보완 요청을 먼저 처리해 주세요.");
  r.completed.push(stage.id);
  r.submitted.push(stage.id);
  r.currentStage += 1;
  return log(
    next,
    ctx,
    `${d.name} · ${stage.name} ${byAdmin ? "결과 확인" : "제출 상태 기록"}`,
    studentId,
    departmentId,
  );
}
export function unconfirmedReason(r: Roadmap, d: Department) {
  if (r.application?.review === "검토 완료") return "확정 완료";
  if (r.application?.status === "승인")
    return r.application.review === "보완 요청"
      ? "행정실 보완 요청"
      : "행정실 검토 대기";
  if (d.advisorMethod === "course_assigned") return "수업 배정 대기";
  return r.application?.status ?? "미신청";
}
