import { departments } from "./departments";
import { generateRoadmaps } from "../lib/rules";
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
    graduation: "2027년 2월",
    configured: i !== 0,
    majors,
    roadmaps: i === 0 ? [] : generateRoadmaps(majors, departments),
  }));
  const professors: Professor[] = departments.flatMap((d, index) =>
    [1, 2].map((n) => ({
      id: `${d.id}-p${n}`,
      departmentId: d.id,
      name: `가상교수 ${String(index * 2 + n).padStart(2, "0")}`,
      keywords: n === 1 ? "방법론 · 융합 연구" : "자료 분석 · 응용 연구",
      preferredTopic:
        n === 1 ? "일상 속 문제를 탐구하는 연구" : "자료에 기반한 현상 분석",
      capacity: d.usesCapacity ? (n === 1 ? 1 : 3) : 0,
      assigned: d.usesCapacity && n === 1 ? 1 : 0,
    })),
  );
  // 정원이 찬 교수에게 이미 배정된 학생과, 정원이 차기 전에 접수된 대기 건.
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
  return {
    students,
    professors,
    history: [
      {
        id: "seed",
        actor: "데모 시스템",
        at: "2026-09-21T00:00:00Z",
        content: "합성 학생 8명 및 가상 학과 3개의 초기 상태 생성",
      },
    ],
  };
}
