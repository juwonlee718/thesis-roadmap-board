import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { createSeed } from "../../data/seed";
const output = "output/playwright";
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function shot(page: Page, path: string) {
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await noOverflow(page);
  await page.screenshot({ path, fullPage: true });
}
async function enter(page: Page, role: "학생" | "교수" | "행정실") {
  const home = page.getByRole("link", { name: "역할 선택으로" });
  if (await home.count()) await home.click();
  else await page.goto("/");
  await page
    .locator(".role-card")
    .filter({ has: page.getByRole("heading", { name: role, exact: true }) })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    {
      학생: "나의 논문 여정",
      교수: "학생의 시작을 함께",
      행정실: "학과의 절차를 한곳에서",
    }[role],
  );
}
async function setup(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "데모 초기화" }).click();
  await enter(page, "학생");
  await page.getByLabel("주전공", { exact: true }).selectOption("psychology");
  await page.getByRole("checkbox", { name: /기계공학과/ }).check();
  await page.getByRole("button", { name: "내 로드맵 만들기" }).click();
  await expect(page.getByTestId("roadmap-psychology")).toBeVisible();
}
async function request(page: Page) {
  await page.getByLabel("연구 주제", { exact: true }).fill("학습 경험 연구");
  await page.getByLabel("간단한 연구계획").fill("합성 자료를 분석합니다.");
  await page.getByRole("button", { name: "가상교수 01 지도 요청" }).click();
}
async function approve(page: Page) {
  await enter(page, "교수");
  await page
    .getByTestId("application-s1")
    .getByRole("button", { name: "승인", exact: true })
    .click();
  await enter(page, "학생");
}
async function upload(page: Page, name: string, content: string) {
  await page
    .getByLabel("최종논문 파일")
    .setInputFiles({
      name,
      mimeType: "text/plain",
      buffer: Buffer.from(content),
    });
  await page.getByRole("button", { name: /^논문 (재)?제출$/ }).click();
  await expect(page.getByTestId("thesis-psychology")).toContainText(
    "검토 대기",
  );
}

test("샤논 브랜드, 헤더 역할 제거, 랜딩 역할선택과 favicon", async ({
  page,
}, info) => {
  mkdirSync(output, { recursive: true });
  await page.goto("/");
  await expect(page).toHaveTitle(/샤논/);
  await expect(page.locator("header")).toContainText("샤논");
  await expect(
    page.locator("header").getByRole("link", { name: /^(학생|교수|행정실)$/ }),
  ).toHaveCount(0);
  const icon = await page
    .locator('link[rel="icon"]')
    .first()
    .getAttribute("href");
  expect(icon).toContain("icon.svg");
  expect((await page.request.get(icon!)).ok()).toBe(true);
  await shot(page, `${output}/${info.project.name}-shannon-home.png`);
  await enter(page, "학생");
  await expect(page.getByLabel("주전공", { exact: true })).toBeVisible();
  await shot(page, `${output}/${info.project.name}-shannon-setup.png`);
  await enter(page, "교수");
  await expect(page.getByLabel("지도 정원", { exact: true })).toBeVisible();
  await enter(page, "행정실");
  await expect(page.getByLabel("학생 검색")).toBeVisible();
});
test("초안 저장·재접속·사이트 지도요청·면담 후 승인과 수강 자동연결", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(
    page.getByRole("checkbox", { name: "교수 컨택 완료" }),
  ).toHaveCount(0);
  await page.getByLabel("연구 주제", { exact: true }).fill("저장할 연구 주제");
  await page.getByLabel("간단한 연구계획").fill("계획만 미리 작성합니다.");
  await page.getByRole("button", { name: "연구계획 초안 저장" }).click();
  await page.reload();
  await expect(page.getByLabel("연구 주제", { exact: true })).toHaveValue(
    "저장할 연구 주제",
  );
  await expect(page.getByLabel("간단한 연구계획")).toHaveValue(
    "계획만 미리 작성합니다.",
  );
  await page.getByRole("button", { name: "가상교수 01 지도 요청" }).click();
  const student = await context.newPage();
  await student.goto("/student");
  await expect(student.getByTestId("roadmap-psychology")).toBeVisible();
  await enter(page, "교수");
  const app = page.getByTestId("application-s1");
  await app.getByRole("button", { name: "면담 요청", exact: true }).click();
  await expect(app.getByRole("alert")).toContainText("피드백");
  await app
    .getByLabel("가상학생 01 피드백")
    .fill("화요일 14시에 면담해 주세요.");
  await app.getByRole("button", { name: "면담 요청", exact: true }).click();
  await expect(
    student.getByText("화요일 14시에 면담해 주세요.", { exact: true }),
  ).toBeVisible();
  await expect(
    app.getByRole("button", { name: "승인", exact: true }),
  ).toBeEnabled();
  await app.getByRole("button", { name: "승인", exact: true }).click();
  await expect(student.getByTestId("confirmation")).toContainText(
    "지도교수 확정 완료",
  );
  await shot(page, `${output}/${info.project.name}-shannon-professor.png`);
  await enter(page, "학생");
  await expect(page.getByTestId("current-stage")).toContainText("논문 작성");
  await page.getByRole("tab", { name: /기계공학과/ }).click();
  await expect(page.getByTestId("current-stage")).toContainText("중간발표");
  await expect(page.getByTestId("roadmap-mechanical")).toContainText(
    "가상교수 03",
  );
  await shot(page, `${output}/${info.project.name}-shannon-student.png`);
  await page.reload();
  await expect(page.getByTestId("confirmation")).toContainText(
    "지도교수 확정 완료",
  );
  expect(errors).toEqual([]);
});
test("면담 이후 반려, 학생 피드백 및 재신청", async ({ page }) => {
  await setup(page);
  await request(page);
  await enter(page, "교수");
  const app = page.getByTestId("application-s1");
  await app.getByLabel("가상학생 01 피드백").fill("면담 일정을 조율해 주세요.");
  await app.getByRole("button", { name: "면담 요청", exact: true }).click();
  await app
    .getByLabel("가상학생 01 피드백")
    .fill("면담 후 연구 범위를 다시 정해 주세요.");
  await app.getByRole("button", { name: "반려", exact: true }).click();
  await enter(page, "학생");
  await expect(
    page.getByText("면담 후 연구 범위를 다시 정해 주세요.", { exact: true }),
  ).toBeVisible();
  await request(page);
  await expect(page.getByTestId("roadmap-psychology")).toContainText("대기");
});
test("모든 교수 정원 설정, 정원 마감 신청·승인 차단", async ({ page }) => {
  await enter(page, "교수");
  await page.getByLabel("지도 정원", { exact: true }).fill("7");
  await page.getByRole("button", { name: "정원 저장" }).click();
  await page.reload();
  await expect(page.getByLabel("지도 정원", { exact: true })).toHaveValue("7");
  await page.getByLabel("데모 교수").selectOption("mechanical-p1");
  await expect(page.getByLabel("지도 정원", { exact: true })).toBeVisible();
  await page.getByLabel("데모 교수").selectOption("sociology-p1");
  await expect(
    page
      .getByTestId("application-s5")
      .getByRole("button", { name: "승인", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("지도 정원", { exact: true }).fill("0");
  await page.getByRole("button", { name: "정원 저장" }).click();
  expect(
    await page
      .getByLabel("지도 정원", { exact: true })
      .evaluate((e: HTMLInputElement) => e.validity.rangeUnderflow),
  ).toBe(true);
  await enter(page, "학생");
  await page.getByLabel("데모 학생").selectOption("s2");
  await expect(
    page.getByRole("button", { name: "가상교수 05 정원 마감" }),
  ).toBeDisabled();
});
test("조교의 순서·마감 편집과 공지가 학생에게 즉시 반영", async ({
  page,
  context,
}, info) => {
  await setup(page);
  const student = await context.newPage();
  await student.goto("/student");
  await expect(student.getByTestId("roadmap-psychology")).toBeVisible();
  await enter(page, "행정실");
  await expect(
    page.getByRole("button", { name: "지도교수 배정", exact: true }),
  ).toHaveCount(0);
  const stage = page.getByTestId("edit-stage-writing");
  await stage.locator("summary").click();
  await stage.getByLabel("단계명", { exact: true }).fill("연구계획 준비");
  await stage.getByLabel("마감일", { exact: true }).fill("2026-10-30");
  await stage.getByRole("button", { name: "연구계획 준비 위로 이동" }).click();
  await page.getByRole("button", { name: "학과 절차 저장" }).click();
  await expect(
    page.getByText(
      "학과 절차를 저장했습니다. 학생 로드맵과 캘린더에 반영되었습니다.",
    ),
  ).toBeVisible();
  await expect(student.getByTestId("current-stage")).toContainText(
    "연구계획 준비",
  );
  await expect(
    student.getByTestId("roadmap-psychology").locator(".timeline > li").first(),
  ).toContainText("2026-10-30");
  await page.getByLabel("공지 제목").fill("수정된 논문 일정을 확인하세요");
  await page
    .getByLabel("공지 내용")
    .fill("연구계획 준비 마감이 10월 30일로 변경되었습니다.");
  await page.getByRole("button", { name: "공지 등록" }).click();
  await expect(
    student.getByText("수정된 논문 일정을 확인하세요", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("edit-stage-writing")).toContainText(
    "연구계획 준비",
  );
  await shot(page, `${output}/${info.project.name}-shannon-admin.png`);
});
test("전체 학생 이름·학번 검색, 졸업·초과학기·학과 필터, 대형 명단 페이지네이션", async ({
  page,
}) => {
  const state = createSeed();
  for (let i = 9; i <= 128; i++)
    state.students.push({
      ...structuredClone(state.students[5]),
      id: `large${i}`,
      name: `가상 대형과 학생 ${i}`,
      number: `SIM-${i}`,
      academicStatus: i % 2 ? "졸업학기" : "초과학기",
    });
  await page.addInitScript(
    (data) =>
      localStorage.setItem(
        "thesis-board-v1",
        JSON.stringify({
          state: { data, studentId: "s1", professorId: "psychology-p1" },
          version: 2,
        }),
      ),
    state,
  );
  await page.goto("/admin");
  await expect(page.locator("#students").getByRole("status")).toContainText(
    "128명",
  );
  await expect(page.locator('[data-testid^="student-row-"]')).toHaveCount(10);
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(page.locator('[data-testid^="student-row-"]')).toHaveCount(10);
  await page.getByLabel("학생 검색").fill("SIM-128");
  await expect(page.getByTestId("student-row-large128")).toBeVisible();
  await expect(page.locator('[data-testid^="student-row-"]')).toHaveCount(1);
  await page.getByLabel("학적 필터").selectOption("졸업학기");
  await expect(page.locator('[data-testid^="student-row-"]')).toHaveCount(0);
  await page.getByLabel("학적 필터").selectOption("초과학기");
  await expect(page.getByTestId("student-row-large128")).toBeVisible();
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await page.getByLabel("학생 검색").fill("가상학생 03");
  await page.getByLabel("학과별 필터").selectOption("sociology");
  await expect(page.getByTestId("student-row-s3")).toContainText("논문 면제");
  await page.getByLabel("학생 검색").fill("DEMO-001");
  await page.getByLabel("학과별 필터").selectOption("psychology");
  await expect(page.getByTestId("student-row-s1")).toContainText(
    "전공 설정 전",
  );
  await noOverflow(page);
});
test("최종논문 실제 파일 전달·다운로드·수정·반려·재제출·승인", async ({
  page,
  context,
}, info) => {
  await setup(page);
  await request(page);
  await approve(page);
  await page
    .getByRole("button", { name: "제출 완료 기록", exact: true })
    .click();
  await upload(page, "논문1.txt", "첫 번째 논문 내용");
  await enter(page, "교수");
  const thesis = page.getByTestId("thesis-review-s1");
  const downloadPromise = page.waitForEvent("download");
  await thesis.getByRole("link", { name: "논문1.txt 다운로드" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString()).toBe("첫 번째 논문 내용");
  await thesis.getByRole("button", { name: "논문 수정 요청" }).click();
  await expect(thesis.getByRole("alert")).toContainText("피드백");
  await thesis
    .getByLabel("가상학생 01 논문 심사 피드백")
    .fill("근거 자료를 보완해 주세요.");
  await thesis.getByRole("button", { name: "논문 수정 요청" }).click();
  await enter(page, "학생");
  await expect(
    page.getByText("근거 자료를 보완해 주세요.", { exact: true }),
  ).toBeVisible();
  await upload(page, "논문2.txt", "두 번째 논문 내용");
  await enter(page, "교수");
  await thesis
    .getByLabel("가상학생 01 논문 심사 피드백")
    .fill("분석 결과를 다시 작성해 주세요.");
  await thesis.getByRole("button", { name: "논문 반려" }).click();
  await enter(page, "학생");
  await expect(
    page.getByText("분석 결과를 다시 작성해 주세요.", { exact: true }),
  ).toBeVisible();
  await upload(page, "최종논문.txt", "최종 수정 논문 내용");
  await enter(page, "교수");
  await thesis.getByRole("button", { name: "논문 승인" }).click();
  await enter(page, "학생");
  await expect(page.getByTestId("current-stage")).toContainText("전체 완료");
  await expect(page.getByTestId("thesis-psychology")).toContainText(
    "최종논문 승인 완료",
  );
  await page.reload();
  await expect(page.getByTestId("thesis-psychology")).toContainText("3차 제출");
  await shot(
    page,
    `${output}/${info.project.name}-shannon-thesis-approved.png`,
  );
  await page.getByRole("tab", { name: /기계공학과/ }).click();
  await expect(page.getByTestId("current-stage")).toContainText("중간발표");
});
test("누락 정보와 예시 배지 렌더링", async ({ page }, info) => {
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
      "body{padding:24px}main{max-width:760px;margin:auto;background:white;padding:24px}",
  });
  await expect(page.getByText("정보 확인 필요", { exact: true })).toHaveCount(
    2,
  );
  await expect(page.getByText("예시 데이터")).toBeVisible();
  await shot(page, `${output}/${info.project.name}-shannon-missing-info.png`);
});
