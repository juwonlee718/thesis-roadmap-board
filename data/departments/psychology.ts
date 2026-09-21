import type { Department } from "../../lib/types";
import { stage } from "./shared";
export const psychology: Department = {
  id: "psychology",
  name: "심리학과",
  semester: "2026-2학기",
  source: "가상",
  sourceDescription:
    "사이트 내 지도 상담과 승인 절차를 설명하는 가상 학과 데이터입니다.",
  verifiedAt: "2026-09-21",
  officialLink: "예시 링크(가상)",
  requirements: { primary: "필수", secondary: "필수" },
  advisorMethod: "contact_approval",
  usesCapacity: true,
  color: "#287768",
  stages: [
    stage(
      "advisor",
      "지도교수 확정",
      "2026-09-25",
      "advisor",
      "시스템",
      ["지도교수 승인 요청서"],
      "연구 주제와 계획을 작성해 교수에게 지도 요청을 보내세요. 사이트에서 면담 요청과 승인 결과를 확인합니다.",
    ),
    stage(
      "writing",
      "논문 작성",
      "2026-10-23",
      "submission",
      "이메일",
      ["논문 초안"],
      "지도교수와 연구 주제를 구체화하고 초안을 작성하세요.",
    ),
    stage(
      "review",
      "심사 제출",
      "2026-11-27",
      "thesis",
      "시스템",
      ["최종논문", "심사 신청서"],
      "심사에 필요한 논문과 신청서를 제출하세요.",
    ),
    stage(
      "result",
      "심사 결과 전달",
      "2026-12-18",
      "result",
      "이메일",
      ["심사 결과서"],
      "지도교수의 최종논문 심사 결과가 자동 반영됩니다.",
    ),
  ],
};
