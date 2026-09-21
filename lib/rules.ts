import type {
  ApplicationStatus,
  BoardState,
  ChangeContext,
  Department,
  Major,
  Professor,
  Roadmap,
  Student,
  ThesisFile,
  ThesisVersion,
} from "./types";
export const FILE_MAX_BYTES = 1024 * 1024;
export const methodLabels = {
  contact_approval: "사이트에서 지도 상담·승인 요청",
  application: "사이트에서 지도 신청 · 정원 적용",
  course_assigned: "수강한 교수별 수업과 자동 연결",
};
export const info = (value: string | undefined | null) =>
  value?.trim() || "정보 확인 필요";
export function validateDepartments(ds: Department[]): string[] {
  return ds.flatMap((d) => [
    ...(["primary", "secondary"] as const)
      .filter((k) => !["필수", "면제"].includes(d.requirements[k]))
      .map((k) => `${d.id}: ${k} 요건 누락`),
    ...(!d.officialLink?.trim() ? [`${d.id}: 공식 링크 누락`] : []),
    ...d.stages
      .filter(
        (s) =>
          !/^\d{4}-\d{2}-\d{2}$/.test(s.deadline) ||
          Number.isNaN(Date.parse(s.deadline)) ||
          new Date(s.deadline).toISOString().slice(0, 10) !== s.deadline,
      )
      .map((s) => `${d.id}/${s.id}: 마감일 누락 또는 오류`),
  ]);
}
export function generateRoadmaps(majors: Major[], ds: Department[]): Roadmap[] {
  if (majors.filter((m) => m.type === "primary").length !== 1)
    throw new Error("주전공을 하나 선택해 주세요.");
  if (new Set(majors.map((m) => m.departmentId)).size !== majors.length)
    throw new Error("같은 전공을 중복 선택할 수 없습니다.");
  return majors.flatMap((m) => {
    const d = ds.find((d) => d.id === m.departmentId);
    if (!d) throw new Error("학과 정보를 찾을 수 없습니다.");
    return d.requirements[m.type] === "필수"
      ? [{ departmentId: d.id, currentStage: 0, completed: [], submitted: [] }]
      : [];
  });
}
export const remaining = (p: Professor) => p.capacity - p.assigned;
export const canApply = (d: Department, p: Professor) =>
  p.departmentId === d.id &&
  d.advisorMethod !== "course_assigned" &&
  (!d.usesCapacity || remaining(p) > 0);
export const canApprove = canApply;
export const canSetCapacity = (p: Professor, value: number) =>
  Number.isInteger(value) && value >= p.assigned && value >= 0;
export function nextTask(student: Student, ds: Department[]) {
  return student.roadmaps
    .flatMap((r) => {
      const d = ds.find((d) => d.id === r.departmentId);
      if (!d) return [];
      const stage = d.stages[r.currentStage];
      const last = r.thesis?.versions.at(-1);
      const correction = !!last && ["수정 요청", "반려"].includes(last.status);
      return stage ? [{ department: d, stage, correction }] : [];
    })
    .sort((a, b) =>
      (a.stage.deadline || "0000").localeCompare(b.stage.deadline || "0000"),
    )[0];
}
export function calendarEvents(student: Student, ds: Department[]) {
  return student.roadmaps
    .flatMap((r) => {
      const d = ds.find((d) => d.id === r.departmentId);
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
export function overlappingWeeks(student: Student, ds: Department[]) {
  const weeks = new Map<string, Set<string>>();
  for (const event of calendarEvents(student, ds).filter(
    (e) => !e.completed && e.stage.deadline,
  )) {
    const date = new Date(event.stage.deadline + "T12:00:00Z");
    if (Number.isNaN(date.getTime())) continue;
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
function recalculate(r: Roadmap, d: Department) {
  const index = d.stages.findIndex((s) => !r.completed.includes(s.id));
  r.currentStage = index < 0 ? d.stages.length : index;
}
export function syncCourseEnrollments(state: BoardState): BoardState {
  const next = structuredClone(state);
  for (const student of next.students)
    for (const r of student.roadmaps) {
      const d = next.departments.find((d) => d.id === r.departmentId);
      if (d?.advisorMethod !== "course_assigned") continue;
      const enrollment = student.courseEnrollments.find(
        (e) => e.departmentId === d.id,
      );
      if (!enrollment) continue;
      const p = next.professors.find(
        (p) => p.id === enrollment.professorId && p.departmentId === d.id,
      );
      if (!p) continue;
      r.application = {
        professorId: p.id,
        status: "승인",
        feedback: "수강 신청한 교수별 수업 정보로 연결되었습니다.",
        contacted: false,
        topic: "수업 내 연구 주제",
        plan: enrollment.courseName,
        requestedAt: "2026-09-01T00:00:00Z",
        review: "검토 완료",
        reviewFeedback: "",
      };
      r.completed = [
        ...new Set([
          ...r.completed,
          ...d.stages
            .filter((s) => s.kind === "course" || s.kind === "advisor")
            .map((s) => s.id),
        ]),
      ];
      recalculate(r, d);
    }
  for (const p of next.professors)
    p.assigned = next.students.reduce(
      (count, s) =>
        count +
        s.roadmaps.filter(
          (r) =>
            r.application?.professorId === p.id &&
            r.application.status === "승인",
        ).length,
      0,
    );
  return next;
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
  return log(
    syncCourseEnrollments(next),
    ctx,
    "전공 설정 및 로드맵 생성 · 수강 교수 자동 연결",
    studentId,
  );
}
export function saveResearchDraft(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  input: { topic: string; plan: string },
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  if (!input.topic.trim() && !input.plan.trim())
    throw new Error("연구 주제 또는 계획을 입력해 주세요.");
  r.draft = { topic: input.topic, plan: input.plan, updatedAt: ctx.at };
  return log(
    next,
    ctx,
    `${d.name} · 연구 주제와 계획 초안 저장`,
    studentId,
    departmentId,
  );
}
export function requestAdvisor(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  professorId: string,
  input: { topic: string; plan: string; contacted?: boolean },
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
    throw new Error("신청할 수 없습니다. 정원 또는 수강 방식을 확인해 주세요.");
  if (
    r.application &&
    ["대기", "면담 요청", "승인"].includes(r.application.status)
  )
    throw new Error("이미 처리 중이거나 승인된 신청입니다.");
  if (!input.topic.trim() || !input.plan.trim())
    throw new Error("연구 주제와 계획을 입력해 주세요.");
  r.draft = {
    topic: input.topic.trim(),
    plan: input.plan.trim(),
    updatedAt: ctx.at,
  };
  r.application = {
    professorId,
    topic: input.topic.trim(),
    plan: input.plan.trim(),
    contacted: false,
    requestedAt: ctx.at,
    status: "대기",
    feedback: "",
    review: "검토 대기",
    reviewFeedback: "",
  };
  return log(
    next,
    ctx,
    `${d.name} · ${p.name}에게 사이트 내 지도 상담·승인 요청`,
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
    !["대기", "면담 요청", "수정 요청"].includes(a.status) ||
    d.advisorMethod === "course_assigned"
  )
    throw new Error("진행 중인 본인 신청만 처리할 수 있습니다.");
  if (status !== "승인" && !feedback.trim())
    throw new Error("학생에게 전달할 피드백을 입력해 주세요.");
  if (status === "승인") {
    if (!canApprove(d, p))
      throw new Error("남은 자리가 없어 승인할 수 없습니다.");
    p.assigned += 1;
    a.review = "검토 완료";
    const stage = d.stages.find((s) => s.kind === "advisor");
    if (stage && !r.completed.includes(stage.id)) r.completed.push(stage.id);
    recalculate(r, d);
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
    !ds.some((d) => d.id === p.departmentId) ||
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
export function recordStage(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  _byAdmin: boolean,
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
  if (!stage || !["course", "submission"].includes(stage.kind))
    throw new Error(
      "이 단계는 지도교수 승인 또는 논문 파일 심사가 필요합니다.",
    );
  r.completed = [...new Set([...r.completed, stage.id])];
  r.submitted = [...new Set([...r.submitted, stage.id])];
  recalculate(r, d);
  return log(
    next,
    ctx,
    `${d.name} · ${stage.name} 제출 상태 기록`,
    studentId,
    departmentId,
  );
}
export function unconfirmedReason(r: Roadmap, d: Department) {
  if (r.application?.status === "승인") return "확정 완료";
  if (d.advisorMethod === "course_assigned") return "수강 정보 확인 필요";
  return r.application?.status ?? "미신청";
}
export function updateDepartment(
  state: BoardState,
  department: Department,
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const index = next.departments.findIndex((d) => d.id === department.id);
  if (index < 0) throw new Error("학과를 찾을 수 없습니다.");
  if (
    !department.name.trim() ||
    !department.semester.trim() ||
    validateDepartments([department]).length
  )
    throw new Error(
      "학과명·학기·요건·공식 링크·유효한 마감일을 모두 입력해 주세요.",
    );
  if (
    new Set(department.stages.map((s) => s.id)).size !==
      department.stages.length ||
    department.stages.some((s) => !s.id.trim() || !s.name.trim())
  )
    throw new Error("단계 ID는 고유해야 하며 단계명을 입력해야 합니다.");
  for (const kind of ["advisor", "thesis", "result"])
    if (department.stages.filter((s) => s.kind === kind).length !== 1)
      throw new Error(
        "지도교수·최종논문·심사결과 단계는 각각 하나씩 필요합니다.",
      );
  const advisor = department.stages.findIndex((s) => s.kind === "advisor");
  const thesis = department.stages.findIndex((s) => s.kind === "thesis");
  const result = department.stages.findIndex((s) => s.kind === "result");
  if (advisor > thesis || thesis > result)
    throw new Error(
      "지도교수 단계 이후 최종논문, 그 이후 심사결과 순서여야 합니다.",
    );
  const old = next.departments[index];
  if (old.stages.some((s) => !department.stages.some((n) => n.id === s.id)))
    throw new Error("이력 보존을 위해 기존 단계는 삭제할 수 없습니다.");
  if (
    old.stages.some(
      (s) => department.stages.find((n) => n.id === s.id)?.kind !== s.kind,
    )
  )
    throw new Error(
      "기존 단계의 처리 유형은 변경할 수 없습니다. 이름·순서·날짜를 편집해 주세요.",
    );
  next.departments[index] = structuredClone(department);
  for (const student of next.students)
    for (const r of student.roadmaps.filter(
      (r) => r.departmentId === department.id,
    ))
      recalculate(r, department);
  return log(
    next,
    ctx,
    `${department.name} · 학과 절차·마감·순서 갱신`,
    undefined,
    department.id,
  );
}
export function publishAnnouncement(
  state: BoardState,
  input: { departmentId: string; title: string; body: string },
  ctx: ChangeContext,
) {
  const next = structuredClone(state);
  const d = next.departments.find((d) => d.id === input.departmentId);
  if (!d || !input.title.trim() || !input.body.trim())
    throw new Error("학과와 공지 제목·본문을 입력해 주세요.");
  next.announcements.unshift({
    id: `notice-${ctx.at}-${next.announcements.length}`,
    departmentId: d.id,
    title: input.title.trim(),
    body: input.body.trim(),
    createdAt: ctx.at,
    author: ctx.actor,
  });
  return log(
    next,
    ctx,
    `${d.name} · 공지 작성: ${input.title.trim()}`,
    undefined,
    d.id,
  );
}
export function validateThesisFile(file: ThesisFile) {
  if (
    !file.fileName.trim() ||
    !Number.isInteger(file.size) ||
    file.size <= 0 ||
    file.size > FILE_MAX_BYTES
  )
    throw new Error("비어 있지 않은 1MB 이하 파일을 선택해 주세요.");
  if (!/\.(pdf|docx|txt)$/i.test(file.fileName))
    throw new Error("PDF, DOCX, TXT 파일만 제출할 수 있습니다.");
  const match = /^data:([^;,]*);base64,([A-Za-z0-9+/]*={0,2})$/.exec(
    file.dataUrl,
  );
  if (!match)
    throw new Error("파일 내용을 읽을 수 없습니다. 다시 선택해 주세요.");
  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/octet-stream",
    "",
  ];
  if (!allowed.includes(match[1]) || !allowed.includes(file.mimeType))
    throw new Error("지원하지 않는 파일 형식입니다.");
  const bytes =
    (match[2].length * 3) / 4 -
    (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
  if (bytes !== file.size)
    throw new Error("파일 크기와 내용이 일치하지 않습니다.");
}
export function submitThesis(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  file: ThesisFile,
  ctx: ChangeContext,
) {
  validateThesisFile(file);
  const next = structuredClone(state);
  const { roadmap: r, department: d } = target(
    next,
    ds,
    studentId,
    departmentId,
  );
  const stage = d.stages[r.currentStage];
  if (stage?.kind !== "thesis" || r.application?.status !== "승인")
    throw new Error(
      "지도교수 승인과 이전 단계를 완료한 후 최종논문을 제출해 주세요.",
    );
  const last = r.thesis?.versions.at(-1);
  if (last && ["검토 대기", "승인"].includes(last.status))
    throw new Error("이미 심사 중이거나 승인된 논문입니다.");
  const version: ThesisVersion = {
    ...file,
    id: `thesis-${ctx.at}-${r.thesis?.versions.length ?? 0}`,
    submittedAt: ctx.at,
    status: "검토 대기",
    feedback: "",
  };
  if (!r.thesis) r.thesis = { stageId: stage.id, versions: [] };
  r.thesis.versions.push(version);
  r.submitted = [...new Set([...r.submitted, stage.id])];
  return log(
    next,
    ctx,
    `${d.name} · 최종논문 ${r.thesis.versions.length}차 제출: ${file.fileName}`,
    studentId,
    departmentId,
  );
}
export function reviewThesis(
  state: BoardState,
  ds: Department[],
  studentId: string,
  departmentId: string,
  professorId: string,
  status: "승인" | "수정 요청" | "반려",
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
  const last = r.thesis?.versions.at(-1);
  if (
    !last ||
    last.status !== "검토 대기" ||
    r.application?.professorId !== professorId ||
    r.application.status !== "승인"
  )
    throw new Error("담당 학생의 심사 대기 논문만 처리할 수 있습니다.");
  if (status !== "승인" && !feedback.trim())
    throw new Error("학생에게 전달할 피드백을 입력해 주세요.");
  last.status = status;
  last.feedback = feedback.trim();
  last.reviewedAt = ctx.at;
  if (status === "승인")
    r.completed = [
      ...new Set([
        ...r.completed,
        ...d.stages
          .filter((s) => s.kind === "thesis" || s.kind === "result")
          .map((s) => s.id),
      ]),
    ];
  recalculate(r, d);
  return log(
    next,
    ctx,
    `${d.name} · 최종논문 ${status}${feedback.trim() ? `: ${feedback.trim()}` : ""}`,
    studentId,
    departmentId,
  );
}
