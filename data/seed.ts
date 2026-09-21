import { departments } from "./departments";
import { generateRoadmaps, syncCourseEnrollments } from "../lib/rules";
import type { BoardState, Major, Professor, Student } from "../lib/types";
const primary = (departmentId: string): Major => ({
  departmentId,
  type: "primary",
});
const secondary = (departmentId: string): Major => ({
  departmentId,
  type: "secondary",
});
const combinations: Major[][] = [
  [primary("psychology"), secondary("mechanical")],
  [primary("sociology"), secondary("psychology")],
  [primary("mechanical"), secondary("sociology")],
  [primary("sociology")],
  [primary("sociology")],
  [primary("psychology")],
  [primary("mechanical")],
  [primary("psychology"), secondary("sociology")],
];
export function createSeed(): BoardState {
  const students: Student[] = combinations.map((majors, i) => ({
    id: `s${i + 1}`,
    name: `가상학생 ${String(i + 1).padStart(2, "0")}`,
    number: `DEMO-${String(i + 1).padStart(3, "0")}`,
    graduation: i === 2 ? "2028년 2월" : "2027년 2월",
    academicStatus:
      i === 1 || i === 4 ? "초과학기" : i === 2 ? "재학" : "졸업학기",
    configured: i !== 0,
    majors,
    roadmaps: i === 0 ? [] : generateRoadmaps(majors, departments),
    courseEnrollments: majors
      .filter(
        (m) =>
          departments.find((d) => d.id === m.departmentId)?.advisorMethod ===
          "course_assigned",
      )
      .map((m) => ({
        departmentId: m.departmentId,
        professorId: `${m.departmentId}-p${i === 6 ? 2 : 1}`,
        courseName: `${departments.find((d) => d.id === m.departmentId)?.name} 졸업논문 · ${i === 6 ? "B" : "A"}분반`,
      })),
  }));
  const professors: Professor[] = departments.flatMap((d, index) =>
    [1, 2].map((n) => ({
      id: `${d.id}-p${n}`,
      departmentId: d.id,
      name: `가상교수 ${String(index * 2 + n).padStart(2, "0")}`,
      keywords: n === 1 ? "방법론 · 융합 연구" : "자료 분석 · 응용 연구",
      preferredTopic:
        n === 1 ? "일상 속 문제를 탐구하는 연구" : "자료에 기반한 현상 분석",
      capacity: d.advisorMethod === "application" && n === 1 ? 1 : 5,
      assigned: 0,
    })),
  );
  students[3].roadmaps[0].application = {
    professorId: "sociology-p1",
    status: "승인",
    feedback: "",
    contacted: false,
    topic: "지역 커뮤니티의 연결",
    plan: "공개 합성 자료를 분석합니다.",
    requestedAt: "2026-09-18T01:00:00Z",
    review: "검토 완료",
    reviewFeedback: "",
  };
  students[3].roadmaps[0].completed = ["advisor"];
  students[3].roadmaps[0].currentStage = 1;
  students[4].roadmaps[0].application = {
    professorId: "sociology-p1",
    status: "대기",
    feedback: "",
    contacted: false,
    topic: "온라인 모임의 관계",
    plan: "가상 설문으로 관계를 탐색합니다.",
    requestedAt: "2026-09-17T01:00:00Z",
    review: "검토 대기",
    reviewFeedback: "",
  };
  return syncCourseEnrollments({
    students,
    professors,
    departments: structuredClone(departments),
    announcements: [
      {
        id: "notice-seed",
        departmentId: departments[0].id,
        title: "사이트에서 지도 상담부터 논문 심사까지 진행하세요",
        body: "연구 주제와 계획은 먼저 초안으로 저장할 수 있습니다. 지도 요청을 보내면 교수와 면담·검토를 진행하며 최종논문도 이곳에서 제출합니다.",
        createdAt: "2026-09-21T00:00:00Z",
        author: "가상 학과 조교",
      },
    ],
    history: [
      {
        id: "seed",
        actor: "데모 시스템",
        at: "2026-09-21T00:00:00Z",
        content: "합성 학생 8명, 수강 교수 정보 및 학과 절차 생성",
      },
    ],
  });
}
export function migrateBoard(old: Partial<BoardState>): BoardState {
  const seed = createSeed();
  const next: BoardState = {
    ...seed,
    ...old,
    departments: seed.departments,
    announcements: old.announcements ?? seed.announcements,
    students: (old.students ?? seed.students).map((s) => ({
      ...s,
      academicStatus:
        s.academicStatus ??
        seed.students.find((n) => n.id === s.id)?.academicStatus ??
        "졸업학기",
      courseEnrollments:
        s.courseEnrollments ??
        seed.students.find((n) => n.id === s.id)?.courseEnrollments ??
        [],
    })),
    professors: (old.professors ?? seed.professors).map((p) => ({
      ...p,
      capacity: Math.max(p.capacity || 5, p.assigned),
    })),
  };
  for (const s of next.students)
    for (const r of s.roadmaps)
      if (r.application?.status === "승인") {
        r.application.review = "검토 완료";
        r.application.reviewFeedback = "";
        const d = next.departments.find((d) => d.id === r.departmentId);
        const advisor = d?.stages.find((s) => s.kind === "advisor");
        if (advisor) r.completed = [...new Set([...r.completed, advisor.id])];
        const index =
          d?.stages.findIndex((s) => !r.completed.includes(s.id)) ?? 0;
        r.currentStage = index < 0 ? (d?.stages.length ?? 0) : index;
      }
  return syncCourseEnrollments(next);
}
