import type { Stage } from "../../lib/types";
export function stage(
  id: string,
  name: string,
  deadline: string,
  kind: Stage["kind"],
  submission: Stage["submission"],
  documents: string[],
  description: string,
): Stage {
  return {
    id,
    name,
    deadline,
    kind,
    submission,
    documents,
    description,
    form: "예시 서식(가상) · 제목 / 전공 / 연구 주제 / 계획 / 확인란",
    evidence:
      kind === "advisor"
        ? "교수 승인 및 행정실 검토 기록"
        : "제출 완료 기록(합성 증빙)",
    notice: "2026-2학기 시연용 절차입니다. 실제 학과 공지를 확인해 주세요.",
    contact:
      "가상 학과 행정실 · thesis-office@example.invalid · 평일 09:00–17:00",
  };
}
