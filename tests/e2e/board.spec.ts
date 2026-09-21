import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const output = "output/playwright";
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
async function screenshot(page: Page, path: string) {
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path, fullPage: true });
}
async function setupStudent(page: Page, prefix?: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "데모 초기화" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "전공은 달라도",
  );
  if (prefix) {
    await noOverflow(page);
    await screenshot(page, `${prefix}-home.png`);
  }
  await page.getByRole("link").filter({ hasText: "학생으로 시작" }).click();
  await page.getByLabel("주전공", { exact: true }).selectOption("psychology");
  await page.getByRole("checkbox", { name: /기계공학과/ }).check();
  if (prefix) {
    await noOverflow(page);
    await screenshot(page, `${prefix}-major-setup.png`);
  }
  await page.getByRole("button", { name: "내 로드맵 만들기" }).click();
  await expect(page.getByTestId("roadmap-psychology")).toBeVisible();
}
async function request(page: Page) {
  await page
    .getByLabel("연구 주제", { exact: true })
    .fill("합성 자료로 살펴보는 학습 경험");
  await page
    .getByLabel("간단한 연구계획")
    .fill("가상 설문 자료를 분석하고 연구 방법을 비교합니다.");
  await page.getByRole("checkbox", { name: "교수 컨택 완료" }).check();
  await page.getByRole("button", { name: "가상교수 01 승인 요청" }).click();
  await expect(
    page.getByText("교수의 검토를 기다리고 있습니다.", { exact: false }),
  ).toBeVisible();
}
async function role(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "역할 전환" })
    .getByRole("link", { name, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    (
      {
        학생: "나의 논문 여정.",
        교수: "학생의 시작을 함께.",
        행정실: "함께 보는 졸업 준비.",
      } as Record<string, string>
    )[name],
  );
}
test("대표 흐름: 전공 설정 → 교수 승인 → 전공별 이동 → 행정실 검토 → 저장 유지", async ({
  page,
}, testInfo) => {
  mkdirSync(output, { recursive: true });
  const prefix = `${output}/${testInfo.project.name}`;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setupStudent(page, prefix);
  await expect(page.getByTestId("next-task")).toContainText("기계공학과");
  await expect(page.getByText("마감이 겹치는 주가 있어요")).toBeVisible();
  await expect(page.getByText("예시 데이터").first()).toBeVisible();
  await noOverflow(page);
  await screenshot(page, `${prefix}-student-before.png`);
  await request(page);
  await role(page, "교수");
  const application = page.getByTestId("application-s1");
  await expect(application).toContainText("합성 자료로 살펴보는 학습 경험");
  await application.getByRole("button", { name: "승인", exact: true }).click();
  await expect(application.getByText("행정실 검토 대기")).toBeVisible();
  await noOverflow(page);
  await screenshot(page, `${prefix}-professor-approved.png`);
  await role(page, "학생");
  await expect(page.getByTestId("current-stage")).toHaveText(
    "현재 단계논문 작성예시 데이터",
  );
  await expect(page.getByTestId("confirmation")).toContainText(
    "행정실 검토 대기",
  );
  await page.getByRole("tab", { name: /기계공학과/ }).click();
  await expect(page.getByTestId("current-stage")).toContainText(
    "졸업논문 수업 수강",
  );
  await expect(
    page
      .getByTestId("roadmap-mechanical")
      .getByRole("button", { name: /승인 요청|지도 신청/ }),
  ).toHaveCount(0);
  await role(page, "행정실");
  await page.getByLabel("학과별 필터").selectOption("psychology");
  const record = page.getByTestId("admin-s1-psychology");
  await expect(record).toContainText("행정실 검토 대기");
  await noOverflow(page);
  await screenshot(page, `${prefix}-admin-review.png`);
  await record.getByRole("button", { name: "검토 완료", exact: true }).click();
  await expect(record).toContainText("확정 완료");
  await role(page, "학생");
  await expect(page.getByTestId("confirmation")).toHaveText(
    "지도교수 확정 완료",
  );
  const advisorStage = page
    .getByTestId("roadmap-psychology")
    .locator("li")
    .first();
  await expect(
    advisorStage.locator(":scope > details > summary"),
  ).toContainText("완료");
  await noOverflow(page);
  await screenshot(page, `${prefix}-student-confirmed.png`);
  await page.reload();
  await expect(page.getByTestId("confirmation")).toHaveText(
    "지도교수 확정 완료",
  );
  await role(page, "행정실");
  await expect(page.locator("#history")).toContainText("확정 검토 완료");
  expect(errors).toEqual([]);
});
for (const status of ["수정 요청", "반려"] as const) {
  test(`${status}: 공백 피드백 거부와 학생 즉시 반영`, async ({
    page,
    context,
  }) => {
    await setupStudent(page);
    await request(page);
    const studentTab = await context.newPage();
    await studentTab.goto("/student");
    await expect(studentTab.getByTestId("roadmap-psychology")).toBeVisible();
    await role(page, "교수");
    const app = page.getByTestId("application-s1");
    await app.getByRole("button", { name: status, exact: true }).click();
    await expect(app.getByRole("alert")).toContainText("피드백을 입력");
    const feedback = `${status}: 연구 질문과 조사 방법을 구체화해 주세요.`;
    await app.getByLabel("가상학생 01 피드백").fill(feedback);
    await app.getByRole("button", { name: status, exact: true }).click();
    await expect(studentTab.getByText(feedback, { exact: true })).toBeVisible();
    await role(page, "학생");
    await expect(page.getByText(feedback, { exact: true })).toBeVisible();
    await expect(page.getByTestId("current-stage")).toContainText(
      "지도교수 확정",
    );
    await request(page);
    await expect(page.getByTestId("roadmap-psychology")).toContainText("대기");
  });
}
test("정원 마감 교수는 학생 신청과 교수 승인이 비활성", async ({ page }) => {
  await page.goto("/student");
  await page.getByLabel("데모 학생").selectOption("s2");
  await expect(
    page.getByRole("button", { name: "가상교수 05 정원 마감" }),
  ).toBeDisabled();
  await role(page, "교수");
  await page.getByLabel("데모 교수").selectOption("sociology-p1");
  await expect(
    page
      .getByTestId("application-s5")
      .getByRole("button", { name: "승인", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("지도 정원", { exact: true }).fill("0");
  await page.getByRole("button", { name: "정원 저장" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "배정 인원 이상의 정수" }),
  ).toBeVisible();
  await page.getByLabel("지도 정원", { exact: true }).fill("2");
  await page.getByRole("button", { name: "정원 저장" }).click();
  await expect(
    page
      .getByTestId("application-s5")
      .getByRole("button", { name: "승인", exact: true }),
  ).toBeEnabled();
});
test("행정실 보완 요청·재검토, 수업 배정과 복수전공 면제", async ({ page }) => {
  await setupStudent(page);
  await request(page);
  await role(page, "교수");
  await page
    .getByTestId("application-s1")
    .getByRole("button", { name: "승인", exact: true })
    .click();
  await role(page, "행정실");
  const record = page.getByTestId("admin-s1-psychology");
  await record.getByRole("button", { name: "보완 요청" }).click();
  await expect(record.getByRole("alert")).toContainText("피드백을 입력");
  await record.getByRole("textbox").fill("요청서의 확인란을 보완해 주세요.");
  await record.getByRole("button", { name: "보완 요청" }).click();
  await role(page, "학생");
  await expect(
    page.getByText("요청서의 확인란을 보완해 주세요.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("보완 내용").fill("확인란을 보완했습니다.");
  await page.getByRole("button", { name: "보완 후 재검토 요청" }).click();
  await role(page, "행정실");
  await page
    .getByTestId("admin-s1-psychology")
    .getByRole("button", { name: "검토 완료", exact: true })
    .click();
  await page
    .getByTestId("admin-s1-mechanical")
    .getByRole("button", { name: "지도교수 배정", exact: true })
    .click();
  await role(page, "학생");
  await page.getByRole("tab", { name: /기계공학과/ }).click();
  await expect(page.getByTestId("current-stage")).toContainText("중간발표");
  await expect(page.getByTestId("confirmation")).toHaveText(
    "지도교수 확정 완료",
  );
  await page.getByLabel("데모 학생").selectOption("s3");
  await page.getByRole("tab", { name: /사회학과/ }).click();
  await expect(page.getByText("졸업논문 면제 전공입니다")).toBeVisible();
  await noOverflow(page);
});
test("누락 정보: 실제 컴포넌트 렌더링과 예시 배지 직접 확인", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const cssUrls = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  const css = await Promise.all(
    cssUrls.map(async (url) => (await page.request.get(url)).text()),
  );
  await page.setContent(readFileSync(`${output}/missing-info.html`, "utf8"));
  for (const content of css) await page.addStyleTag({ content });
  await page.addStyleTag({
    content:
      "body{padding:24px}main{max-width:760px;margin:auto;background:white;padding:24px;border-radius:12px}h1{margin-bottom:16px}.department-guide{margin-top:24px}",
  });
  await expect(page.getByText("정보 확인 필요", { exact: true })).toHaveCount(
    2,
  );
  await expect(
    page.getByText("주전공 정보 확인 필요 · 복수전공 필수"),
  ).toBeVisible();
  await expect(page.getByText("예시 데이터")).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `${output}/${testInfo.project.name}-missing-info.png`,
    fullPage: true,
  });
});
