import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { departments } from "../data/departments";
import { createSeed } from "../data/seed";
import { info, validateDepartments } from "../lib/rules";
import { DepartmentGuide, StageDetails } from "../components/shared";
describe("학과 데이터 완결성", () => {
  it("모든 학과의 요건·공식 링크와 모든 단계의 학기 내 마감일이 존재한다", () => {
    expect(validateDepartments(departments)).toEqual([]);
    expect(departments).toHaveLength(3);
  });
  it.each(["primary", "secondary"] as const)(
    "%s 요건 하나라도 누락되면 실패한다",
    (key) => {
      const ds = structuredClone(departments);
      ds[0].requirements[key] = "";
      expect(validateDepartments(ds).length).toBeGreaterThan(0);
    },
  );
  it("공식 링크 하나라도 누락되면 실패한다", () => {
    const ds = structuredClone(departments);
    ds[1].officialLink = "";
    expect(validateDepartments(ds)).toContain("mechanical: 공식 링크 누락");
  });
  it("마감 하나라도 누락되면 실패한다", () => {
    const ds = structuredClone(departments);
    ds[2].stages[2].deadline = "";
    expect(validateDepartments(ds).length).toBe(1);
  });
  it("모든 공식 링크는 가상 표시이고, 인물은 합성 식별자다", () => {
    expect(
      departments.every(
        (d) => d.officialLink === "예시 링크(가상)" && d.source === "가상",
      ),
    ).toBe(true);
    const seed = createSeed();
    expect(seed.students).toHaveLength(8);
    expect(seed.students.every((s) => s.name.startsWith("가상학생"))).toBe(
      true,
    );
    expect(seed.professors.every((p) => p.name.startsWith("가상교수"))).toBe(
      true,
    );
  });
  it("누락된 요건·공식 링크·마감일은 실제 화면 컴포넌트에서 정보 확인 필요로 표시된다", () => {
    const d = structuredClone(departments[0]);
    d.requirements.primary = "";
    d.officialLink = "";
    d.stages[0].deadline = "";
    const markup = renderToStaticMarkup(
      <main>
        <h1>누락 정보 표시 검증</h1>
        <p>운영 데이터가 아닌 검증용 fixture입니다.</p>
        <DepartmentGuide department={d} />
        <StageDetails stage={d.stages[0]} />
      </main>,
    );
    expect(markup.match(/정보 확인 필요/g)).toHaveLength(3);
    expect(markup).toContain("예시 데이터");
    expect(info("   ")).toBe("정보 확인 필요");
    mkdirSync("output/playwright", { recursive: true });
    writeFileSync(
      "output/playwright/missing-info.html",
      `<!doctype html><html lang="ko"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>누락 정보 검증</title><body>${markup}</body></html>`,
    );
  });
});
