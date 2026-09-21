import { describe, expect, it } from "vitest";
import { createSeed } from "../data/seed";
import { departments } from "../data/departments";
import {
  assignAdvisor,
  canApply,
  canApprove,
  canSetCapacity,
  configureMajors,
  decideApplication,
  generateRoadmaps,
  nextTask,
  overlappingWeeks,
  recordStage,
  requestAdvisor,
  resubmitReview,
  reviewConfirmation,
  setCapacity,
} from "../lib/rules";
import type { BoardState, Department } from "../lib/types";
const ctx = { actor: "테스트 사용자", at: "2026-09-21T09:00:00Z" };
function configured() {
  return configureMajors(
    createSeed(),
    departments,
    "s1",
    [
      { departmentId: "psychology", type: "primary" },
      { departmentId: "mechanical", type: "secondary" },
    ],
    ctx,
  );
}
function requested(): BoardState {
  return requestAdvisor(
    configured(),
    departments,
    "s1",
    "psychology",
    "psychology-p1",
    { topic: "가상 연구", plan: "합성 데이터 분석", contacted: true },
    ctx,
  );
}
function approved(): BoardState {
  return decideApplication(
    requested(),
    departments,
    "s1",
    "psychology",
    "psychology-p1",
    "승인",
    "",
    ctx,
  );
}
describe("전공 데이터로 생성하는 로드맵", () => {
  it("입력 전공과 새 학과 데이터만으로 로드맵을 생성한다", () => {
    const custom: Department = {
      ...departments[0],
      id: "new-dept",
      name: "새 가상 학과",
      stages: [
        { ...departments[0].stages[0], id: "custom-stage", name: "새 단계" },
      ],
    };
    const roadmaps = generateRoadmaps(
      [
        { departmentId: custom.id, type: "primary" },
        { departmentId: "mechanical", type: "secondary" },
      ],
      [...departments, custom],
    );
    expect(roadmaps.map((r) => r.departmentId)).toEqual([
      "new-dept",
      "mechanical",
    ]);
    expect(
      nextTask({ ...createSeed().students[0], roadmaps }, [
        ...departments,
        custom,
      ])?.department.id,
    ).toBe("mechanical");
  });
  it("복수전공 면제는 로드맵을 생성하지 않는다", () => {
    expect(
      generateRoadmaps(
        [
          { departmentId: "psychology", type: "primary" },
          { departmentId: "sociology", type: "secondary" },
        ],
        departments,
      ),
    ).toHaveLength(1);
  });
  it("주전공 하나와 중복 없는 조합을 요구한다", () => {
    expect(() => generateRoadmaps([], departments)).toThrow();
    expect(() =>
      generateRoadmaps(
        [
          { departmentId: "psychology", type: "primary" },
          { departmentId: "psychology", type: "secondary" },
        ],
        departments,
      ),
    ).toThrow();
  });
  it("전공 통틀어 가장 급한 현재 단계를 고른다", () => {
    const task = nextTask(configured().students[0], departments);
    expect(task?.department.id).toBe("mechanical");
    expect(task?.stage.deadline).toBe("2026-09-24");
  });
  it("같은 주 다른 전공의 마감 겹침을 찾는다", () => {
    expect(
      overlappingWeeks(configured().students[0], departments).map(
        (c) => c.week,
      ),
    ).toContain("2026-09-21");
  });
});
describe("정원과 신청 규칙", () => {
  it("정원 마감 교수에게 신청과 승인 모두 불가하다", () => {
    const state = createSeed();
    const p = state.professors.find((p) => p.id === "sociology-p1")!;
    expect(canApply(departments[2], p)).toBe(false);
    expect(canApprove(departments[2], p)).toBe(false);
    expect(() =>
      requestAdvisor(
        state,
        departments,
        "s2",
        "sociology",
        p.id,
        { topic: "주제", plan: "계획", contacted: false },
        ctx,
      ),
    ).toThrow();
    expect(() =>
      decideApplication(
        state,
        departments,
        "s5",
        "sociology",
        p.id,
        "승인",
        "",
        ctx,
      ),
    ).toThrow();
  });
  it("정원은 배정 인원보다 작은 값·소수·음수로 변경할 수 없다", () => {
    const state = createSeed();
    const p = state.professors.find((p) => p.id === "sociology-p1")!;
    for (const v of [0, -1, 1.5]) {
      expect(canSetCapacity(p, v)).toBe(false);
      expect(() => setCapacity(state, departments, p.id, v, ctx)).toThrow();
    }
    expect(
      setCapacity(state, departments, p.id, 2, ctx).professors.find(
        (p) => p.id === "sociology-p1",
      )?.capacity,
    ).toBe(2);
  });
  it("정원 미적용 학과는 정원 0이어도 승인할 수 있다", () => {
    const state = configured();
    expect(canApply(departments[0], state.professors[0])).toBe(true);
  });
  it("직접 컨택 완료와 연구계획이 필요하다", () => {
    expect(() =>
      requestAdvisor(
        configured(),
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        { topic: "주제", plan: "계획", contacted: false },
        ctx,
      ),
    ).toThrow("컨택");
    expect(() =>
      requestAdvisor(
        configured(),
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        { topic: " ", plan: "계획", contacted: true },
        ctx,
      ),
    ).toThrow("주제");
  });
  it("수업 배정 학과에는 학생 신청이 없다", () => {
    expect(() =>
      requestAdvisor(
        configured(),
        departments,
        "s1",
        "mechanical",
        "mechanical-p1",
        { topic: "주제", plan: "계획", contacted: true },
        ctx,
      ),
    ).toThrow();
  });
  it("동일 신청을 중복 접수할 수 없다", () => {
    expect(() =>
      requestAdvisor(
        requested(),
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        { topic: "주제", plan: "계획", contacted: true },
        ctx,
      ),
    ).toThrow("이미");
  });
});
describe("역할 사이 상태 전이", () => {
  it("승인 시 해당 전공만 이동하며 비정원 학과의 배정 인원은 유지된다", () => {
    const before = requested();
    const after = decideApplication(
      before,
      departments,
      "s1",
      "psychology",
      "psychology-p1",
      "승인",
      "",
      ctx,
    );
    expect(after.students[0].roadmaps[0].currentStage).toBe(1);
    expect(after.students[0].roadmaps[0].completed).not.toContain("advisor");
    expect(after.students[0].roadmaps[1]).toEqual(
      before.students[0].roadmaps[1],
    );
    expect(after.professors).toEqual(before.professors);
    expect(before.students[0].roadmaps[0].application?.status).toBe("대기");
    expect(after.history).toHaveLength(before.history.length + 1);
  });
  it("정원 학과 승인 시에만 배정 인원이 1 증가한다", () => {
    const before = requestAdvisor(
      createSeed(),
      departments,
      "s2",
      "sociology",
      "sociology-p2",
      { topic: "연구", plan: "계획", contacted: false },
      ctx,
    );
    const after = decideApplication(
      before,
      departments,
      "s2",
      "sociology",
      "sociology-p2",
      "승인",
      "",
      ctx,
    );
    expect(
      after.professors.find((p) => p.id === "sociology-p2")?.assigned,
    ).toBe(1);
    expect(after.students[1].roadmaps[0].currentStage).toBe(1);
    expect(after.students[1].roadmaps[1]).toEqual(
      before.students[1].roadmaps[1],
    );
    expect(() =>
      decideApplication(
        after,
        departments,
        "s2",
        "sociology",
        "sociology-p2",
        "승인",
        "",
        ctx,
      ),
    ).toThrow();
  });
  it.each(["수정 요청", "면담 요청", "반려"] as const)(
    "%s에는 공백 아닌 피드백이 필수다",
    (status) => {
      expect(() =>
        decideApplication(
          requested(),
          departments,
          "s1",
          "psychology",
          "psychology-p1",
          status,
          "   ",
          ctx,
        ),
      ).toThrow("피드백");
      expect(
        decideApplication(
          requested(),
          departments,
          "s1",
          "psychology",
          "psychology-p1",
          status,
          "계획을 보완해 주세요",
          ctx,
        ).students[0].roadmaps[0].application?.feedback,
      ).toBe("계획을 보완해 주세요");
    },
  );
  it("다른 교수는 신청을 처리할 수 없다", () => {
    expect(() =>
      decideApplication(
        requested(),
        departments,
        "s1",
        "psychology",
        "psychology-p2",
        "승인",
        "",
        ctx,
      ),
    ).toThrow();
  });
  it("행정실 보완 요청에는 피드백이 필요하고 다음 할 일에 우선 노출한다", () => {
    expect(() =>
      reviewConfirmation(
        approved(),
        departments,
        "s1",
        "psychology",
        "보완 요청",
        "  ",
        ctx,
      ),
    ).toThrow("피드백");
    let state = recordStage(
      approved(),
      departments,
      "s1",
      "mechanical",
      false,
      ctx,
    );
    state = reviewConfirmation(
      state,
      departments,
      "s1",
      "psychology",
      "보완 요청",
      "확인란 보완",
      ctx,
    );
    expect(nextTask(state.students[0], departments)?.correction).toBe(true);
    expect(() =>
      recordStage(state, departments, "s1", "psychology", false, ctx),
    ).toThrow();
    expect(() =>
      resubmitReview(state, departments, "s1", "psychology", "", ctx),
    ).toThrow();
    expect(
      resubmitReview(state, departments, "s1", "psychology", "보완 완료", ctx)
        .students[0].roadmaps[0].application?.review,
    ).toBe("검토 대기");
  });
  it("행정실 검토 완료로 지도교수 확정 단계가 완료된다", () => {
    const state = reviewConfirmation(
      approved(),
      departments,
      "s1",
      "psychology",
      "검토 완료",
      "",
      ctx,
    );
    expect(state.students[0].roadmaps[0].completed).toContain("advisor");
    expect(state.students[0].roadmaps[0].application?.review).toBe("검토 완료");
    expect(state.students[0].roadmaps[1].completed).toEqual([]);
  });
  it("교수 승인 전에 확정 검토할 수 없다", () => {
    expect(() =>
      reviewConfirmation(
        requested(),
        departments,
        "s1",
        "psychology",
        "검토 완료",
        "",
        ctx,
      ),
    ).toThrow();
  });
  it("수업 배정은 해당 전공만 변경하며 배정 인원 카운터는 유지한다", () => {
    const before = configured();
    const after = assignAdvisor(
      before,
      departments,
      "s1",
      "mechanical",
      "mechanical-p1",
      ctx,
    );
    expect(after.students[0].roadmaps[1].completed).toEqual([
      "course",
      "advisor",
    ]);
    expect(after.students[0].roadmaps[1].currentStage).toBe(2);
    expect(after.students[0].roadmaps[0]).toEqual(
      before.students[0].roadmaps[0],
    );
    expect(after.professors).toEqual(before.professors);
  });
  it("제출 상태 기록과 최종 결과 확인의 담당자를 구분한다", () => {
    let state = approved();
    state = recordStage(state, departments, "s1", "psychology", false, ctx);
    state = recordStage(state, departments, "s1", "psychology", false, ctx);
    expect(() =>
      recordStage(state, departments, "s1", "psychology", false, ctx),
    ).toThrow();
    expect(() =>
      recordStage(state, departments, "s1", "psychology", true, ctx),
    ).toThrow("확정 검토");
    state = reviewConfirmation(
      state,
      departments,
      "s1",
      "psychology",
      "검토 완료",
      "",
      ctx,
    );
    expect(
      recordStage(state, departments, "s1", "psychology", true, ctx).students[0]
        .roadmaps[0].currentStage,
    ).toBe(4);
  });
});
