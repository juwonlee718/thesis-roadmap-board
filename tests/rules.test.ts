import { describe, expect, it } from "vitest";
import { createSeed, migrateBoard } from "../data/seed";
import { departments } from "../data/departments";
import {
  canApply,
  canApprove,
  canSetCapacity,
  configureMajors,
  decideApplication,
  generateRoadmaps,
  nextTask,
  overlappingWeeks,
  publishAnnouncement,
  recordStage,
  remaining,
  requestAdvisor,
  reviewThesis,
  saveResearchDraft,
  setCapacity,
  submitThesis,
  updateDepartment,
  validateThesisFile,
} from "../lib/rules";
import type { BoardState, Department, ThesisFile } from "../lib/types";
const ctx = { actor: "테스트 사용자", at: "2026-09-21T09:00:00Z" };
const file: ThesisFile = {
  fileName: "논문.txt",
  mimeType: "text/plain",
  size: 5,
  dataUrl: "data:text/plain;base64,aGVsbG8=",
};
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
function requested() {
  return requestAdvisor(
    configured(),
    departments,
    "s1",
    "psychology",
    "psychology-p1",
    { topic: "합성 연구", plan: "합성 데이터로 분석" },
    ctx,
  );
}
function approved() {
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
function thesisReady() {
  return recordStage(approved(), departments, "s1", "psychology", false, ctx);
}
function submitted() {
  return submitThesis(
    thesisReady(),
    departments,
    "s1",
    "psychology",
    file,
    ctx,
  );
}
describe("데이터 기반 전공과 수강 연동", () => {
  it("새 학과와 전공 조합만으로 로드맵 생성", () => {
    const d: Department = { ...departments[0], id: "new", name: "새 학과" };
    expect(
      generateRoadmaps([{ departmentId: "new", type: "primary" }], [d])[0]
        .departmentId,
    ).toBe("new");
  });
  it("복수전공 면제는 생성하지 않음", () =>
    expect(
      generateRoadmaps(
        [
          { departmentId: "psychology", type: "primary" },
          { departmentId: "sociology", type: "secondary" },
        ],
        departments,
      ),
    ).toHaveLength(1));
  it("중복 전공과 주전공 누락 거부", () => {
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
  it("수강한 교수 수업이 자동연결되고 수강 및 배정단계 완료", () => {
    const r = configured().students[0].roadmaps[1];
    expect(r.application?.professorId).toBe("mechanical-p1");
    expect(r.completed).toEqual(["course", "advisor"]);
    expect(r.currentStage).toBe(2);
  });
  it("수업 전공은 별도 지도교수 신청 불가", () =>
    expect(() =>
      requestAdvisor(
        configured(),
        departments,
        "s1",
        "mechanical",
        "mechanical-p1",
        { topic: "주제", plan: "계획" },
        ctx,
      ),
    ).toThrow());
  it("전공 통틀어 가장 빠른 미완료 단계와 주간 겹침", () => {
    const s = configured().students[0];
    expect(nextTask(s, departments)?.stage.deadline).toBe("2026-09-25");
    expect(overlappingWeeks(s, departments).map((w) => w.week)).toContain(
      "2026-10-19",
    );
  });
  it("v1 저장 상태 마이그레이션은 기존 이름/신청을 보존하고 새 필드를 채움", () => {
    const state = requested();
    const legacy = structuredClone(state) as any;
    delete legacy.departments;
    delete legacy.announcements;
    delete legacy.students[0].academicStatus;
    delete legacy.students[0].courseEnrollments;
    const next = migrateBoard(legacy);
    expect(next.students[0].roadmaps[0].application?.topic).toBe("합성 연구");
    expect(next.students[0].academicStatus).toBe("졸업학기");
    expect(next.departments).toHaveLength(3);
  });
});
describe("사이트 내 상담과 교수 정원", () => {
  it("교수 없이 주제만으로 초안 저장되며 신청은 발생하지 않음", () => {
    const before = configured();
    const next = saveResearchDraft(
      before,
      departments,
      "s1",
      "psychology",
      { topic: "초안", plan: "" },
      ctx,
    );
    expect(next.students[0].roadmaps[0].draft?.topic).toBe("초안");
    expect(next.students[0].roadmaps[0].application).toBeUndefined();
    expect(before.students[0].roadmaps[0].draft).toBeUndefined();
    expect(next.history[0].content).toContain("초안 저장");
  });
  it("외부 컨택 체크 없이 요청 가능, 빈 주제/계획은 거부", () => {
    expect(requested().students[0].roadmaps[0].application?.status).toBe(
      "대기",
    );
    expect(() =>
      requestAdvisor(
        configured(),
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        { topic: " ", plan: "계획" },
        ctx,
      ),
    ).toThrow("주제");
  });
  it.each(["승인", "반려", "수정 요청"] as const)(
    "면담 요청 이후 같은 신청에서 %s 가능",
    (status) => {
      const meeting = decideApplication(
        requested(),
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        "면담 요청",
        "화요일 면담",
        ctx,
      );
      const next = decideApplication(
        meeting,
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        status,
        status === "승인" ? "" : "면담 후 의견",
        ctx,
      );
      expect(next.students[0].roadmaps[0].application?.status).toBe(status);
      expect(next.history[1].content).toContain("면담 요청");
    },
  );
  it.each(["면담 요청", "수정 요청", "반려"] as const)(
    "%s 공백 피드백 거부",
    (status) =>
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
      ).toThrow("피드백"),
  );
  it("승인 즉시 해당전공 확정, 다른 전공은 보존, 배정+1은 한 번만", () => {
    const before = requested();
    const next = approved();
    expect(next.students[0].roadmaps[0].completed).toContain("advisor");
    expect(next.students[0].roadmaps[0].application?.review).toBe("검토 완료");
    expect(next.students[0].roadmaps[1]).toEqual(
      before.students[0].roadmaps[1],
    );
    expect(next.professors[0].assigned).toBe(1);
    expect(() =>
      decideApplication(
        next,
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        "승인",
        "",
        ctx,
      ),
    ).toThrow();
  });
  it("정원 마감 신청/승인 차단", () => {
    const state = createSeed();
    const p = state.professors.find((p) => p.id === "sociology-p1")!;
    expect(canApply(departments[2], p)).toBe(false);
    expect(canApprove(departments[2], p)).toBe(false);
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
    ).toThrow("자리");
  });
  it("모든 교수 정원 설정, 배정 이하/소수/음수 차단", () => {
    const state = configured();
    for (const p of state.professors) {
      const next = setCapacity(state, departments, p.id, p.assigned + 4, ctx);
      expect(next.professors.find((n) => n.id === p.id)?.capacity).toBe(
        p.assigned + 4,
      );
      expect(canSetCapacity(p, -1)).toBe(false);
      expect(canSetCapacity(p, 1.5)).toBe(false);
      if (p.assigned > 0)
        expect(() =>
          setCapacity(state, departments, p.id, p.assigned - 1, ctx),
        ).toThrow();
    }
  });
  it("다른 교수의 신청 승인 거부", () =>
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
    ).toThrow());
});
describe("조교 절차와 공지 관리", () => {
  it("날짜/이름/순서를 바꾸고 기존 완료 ID 보존 및 현재단계 재계산", () => {
    const state = approved();
    const d = structuredClone(state.departments[0]);
    d.stages[1].deadline = "2027-01-10";
    d.stages[1].name = "개정된 초안 준비";
    [d.stages[0], d.stages[1]] = [d.stages[1], d.stages[0]];
    const next = updateDepartment(state, d, ctx);
    expect(next.departments[0].stages[0].name).toBe("개정된 초안 준비");
    expect(next.students[0].roadmaps[0].currentStage).toBe(0);
    expect(next.students[0].roadmaps[0].completed).toEqual(["advisor"]);
    expect(next.students[0].roadmaps[1]).toEqual(state.students[0].roadmaps[1]);
  });
  it("무효 마감일/중복 단계 ID/필수처리 순서 거부", () => {
    for (const mutate of [
      (d: Department) => {
        d.stages[0].deadline = "2026-02-30";
      },
      (d: Department) => {
        d.stages[1].id = d.stages[0].id;
      },
      (d: Department) => {
        [d.stages[0], d.stages[2]] = [d.stages[2], d.stages[0]];
      },
    ]) {
      const state = createSeed();
      const d = structuredClone(state.departments[0]);
      mutate(d);
      expect(() => updateDepartment(state, d, ctx)).toThrow();
    }
  });
  it("공지 저장 및 피드백 없는 공지 거부", () => {
    const state = publishAnnouncement(
      createSeed(),
      {
        departmentId: "psychology",
        title: "마감 변경",
        body: "새 마감은 10월 30일입니다.",
      },
      ctx,
    );
    expect(state.announcements[0].title).toBe("마감 변경");
    expect(state.history[0].content).toContain("공지 작성");
    expect(() =>
      publishAnnouncement(
        state,
        { departmentId: "psychology", title: "", body: "" },
        ctx,
      ),
    ).toThrow();
  });
});
describe("실제 논문 파일과 교수 심사", () => {
  it("파일 bytes가 상태에 저장되고 현재 단계는 검토 대기 유지", () => {
    const s = submitted();
    expect(s.students[0].roadmaps[0].thesis?.versions[0].dataUrl).toBe(
      file.dataUrl,
    );
    expect(s.students[0].roadmaps[0].currentStage).toBe(2);
  });
  it("초과 크기, 지원하지 않는 형식, 내용 불일치 거부", () => {
    expect(() =>
      validateThesisFile({ ...file, size: 1024 * 1024 + 1 }),
    ).toThrow("1MB");
    expect(() =>
      validateThesisFile({ ...file, fileName: "script.html" }),
    ).toThrow("파일");
    expect(() => validateThesisFile({ ...file, size: 6 })).toThrow("일치");
  });
  it("지도교수 승인/선행단계 전 제출과 중복 제출 거부", () => {
    expect(() =>
      submitThesis(configured(), departments, "s1", "psychology", file, ctx),
    ).toThrow();
    expect(() =>
      submitThesis(submitted(), departments, "s1", "psychology", file, ctx),
    ).toThrow("이미");
  });
  it.each(["수정 요청", "반려"] as const)(
    "%s 피드백 필수, 재제출시 이전 파일/피드백 보존",
    (status) => {
      expect(() =>
        reviewThesis(
          submitted(),
          departments,
          "s1",
          "psychology",
          "psychology-p1",
          status,
          " ",
          ctx,
        ),
      ).toThrow("피드백");
      let state = reviewThesis(
        submitted(),
        departments,
        "s1",
        "psychology",
        "psychology-p1",
        status,
        "방법을 보완하세요",
        ctx,
      );
      state = submitThesis(
        state,
        departments,
        "s1",
        "psychology",
        { ...file, fileName: "수정본.txt" },
        ctx,
      );
      const versions = state.students[0].roadmaps[0].thesis!.versions;
      expect(versions).toHaveLength(2);
      expect(versions[0].feedback).toBe("방법을 보완하세요");
      expect(versions[1].status).toBe("검토 대기");
    },
  );
  it("담당교수만 승인 가능, 승인시 최종논문과 심사결과 완료", () => {
    const state = submitted();
    expect(() =>
      reviewThesis(
        state,
        departments,
        "s1",
        "psychology",
        "psychology-p2",
        "승인",
        "",
        ctx,
      ),
    ).toThrow("담당");
    const next = reviewThesis(
      state,
      departments,
      "s1",
      "psychology",
      "psychology-p1",
      "승인",
      "잘 작성했습니다",
      ctx,
    );
    expect(next.students[0].roadmaps[0].completed).toEqual([
      "advisor",
      "writing",
      "review",
      "result",
    ]);
    expect(next.students[0].roadmaps[0].currentStage).toBe(4);
    expect(next.students[0].roadmaps[1]).toEqual(state.students[0].roadmaps[1]);
  });
  it("최종논문/심사 단계를 상태기록 버튼으로 우회할 수 없음", () =>
    expect(() =>
      recordStage(thesisReady(), departments, "s1", "psychology", true, ctx),
    ).toThrow("심사"));
});
