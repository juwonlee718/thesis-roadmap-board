import { afterEach, describe, expect, it, vi } from "vitest";
import { saveResearchDraft, configureMajors } from "../lib/rules";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("브라우저 저장 원자성", () => {
  it("저장 용량 오류가 나면 화면 상태도 변경하지 않는다", async () => {
    const memory = new Map<string, string>();
    let fail = false;
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (fail) throw new Error("quota");
        memory.set(k, v);
      },
      removeItem: (k: string) => memory.delete(k),
    });
    const { useBoard } = await import("../lib/store");
    const ctx = { actor: "테스트", at: "2026-09-21T10:00:00Z" };
    useBoard
      .getState()
      .change((s) =>
        configureMajors(
          s,
          s.departments,
          "s1",
          [{ departmentId: "psychology", type: "primary" }],
          ctx,
        ),
      );
    const before = useBoard.getState().data;
    fail = true;
    expect(() =>
      useBoard
        .getState()
        .change((s) =>
          saveResearchDraft(
            s,
            s.departments,
            "s1",
            "psychology",
            { topic: "저장안됨", plan: "" },
            ctx,
          ),
        ),
    ).toThrow("저장");
    expect(useBoard.getState().data).toEqual(before);
  });
});
