const courses = [
  {
    id: "M1522.000900-001", code: "M1522.000900 · 001", name: "자료구조", department: "컴퓨터공학부",
    professor: "김교수", time: "월·수 11:00–12:15", room: "301동 118호",
    remark: "선착순 1일차 컴퓨터공학부 주전공 2학년 우선. 2일차부터 컴퓨터공학부 전체, 3일차부터 전체 학생 허용.",
    source: "강좌 상세정보 비고 · 데모",
    evaluate: function(p) {
      if (p.day >= 3) return verdict("available", "신청 가능", "현재 시점에는 전체 학생에게 열린 분반입니다.");
      if (p.major !== "컴퓨터공학부") return verdict("later", "3일차부터 가능", "타과생 제한이 풀리는 3일차에 다시 확인하세요.");
      if (p.day >= 2) return verdict("available", "신청 가능", "컴퓨터공학부 학생에게 열린 시점입니다.");
      if (p.track === "primary" && p.year === 2) return verdict("available", "신청 가능", "1일차 우선 대상인 주전공 2학년 조건을 충족합니다.");
      return verdict("later", "2일차부터 가능", "1일차에는 주전공 2학년만 우선 신청할 수 있습니다.");
    }
  },
  {
    id: "M2177.003100-002", code: "M2177.003100 · 002", name: "화학생물공정실험", department: "화학생물공학부",
    professor: "이교수", time: "화 14:00–18:00", room: "302동 509호",
    remark: "화학생물공학부 주전공 및 제2전공 3학년. 지정 분반을 확인할 것. 타과생은 담당자 승인 필요.",
    source: "개설 학과 공지 · 데모",
    evaluate: function(p) {
      var belongs = p.major === "화학생물공학부" && (p.track === "primary" || p.track === "double");
      if (!belongs) return verdict("check", "승인 확인 필요", "타과생은 자동 판정할 수 없습니다. 개설 학과에 승인 가능 여부를 문의하세요.");
      if (p.year !== 3) return verdict("blocked", "지정 학년 아님", "이 분반은 3학년 대상입니다. 학년별 지정 분반을 확인하세요.");
      return verdict("check", "분반 확인 필요", "전공·학년 조건은 맞지만 지정 분반 배정 여부를 추가로 확인해야 합니다.");
    }
  },
  {
    id: "L0444.000600-001", code: "L0444.000600 · 001", name: "글쓰기의 기초", department: "기초교육원",
    professor: "박교수", time: "금 09:00–11:50", room: "61동 320호",
    remark: "신입생 대상 강좌. 재수강생 수강 불가. 수강반 제한은 강좌 상세정보에서 확인.",
    source: "강의계획서 비고 · 데모",
    evaluate: function(p) {
      if (p.attempt === "retake") return verdict("blocked", "신청 제한", "비고에 재수강생 수강 불가로 명시되어 있습니다.");
      if (p.year !== 1) return verdict("blocked", "대상 학년 아님", "신입생 대상 강좌라 현재 학년으로는 신청하기 어렵습니다.");
      return verdict("check", "상세 제한 확인", "학년·수강 이력은 맞지만 강좌 상세의 수강반 제한을 추가로 확인해야 합니다.");
    }
  },
  {
    id: "M1312.001000-003", code: "M1312.001000 · 003", name: "경영학원론", department: "경영학과",
    professor: "최교수", time: "화·목 12:30–13:45", room: "58동 119호",
    remark: "수강대상 제한 없음. 타전공 학생도 신청 가능. 수강정원 초과 시 장바구니 신청자 우선.",
    source: "강좌 상세정보 비고 · 데모",
    evaluate: function() { return verdict("available", "조건 충족", "전공·학년 제한은 없습니다. 장바구니 및 여석 여부는 별도로 확인하세요."); }
  },
  {
    id: "M3500.001300-001", code: "M3500.001300 · 001", name: "인공지능과 윤리", department: "협동과정",
    professor: "정교수", time: "수 15:00–17:50", room: "83동 404호",
    remark: "학부 3학년 이상 권장. 첫 수업에서 담당교수의 수강 승인을 받아야 함.",
    source: "강의계획서 비고 · 데모",
    evaluate: function(p) {
      if (p.year < 3) return verdict("check", "권장 조건 미달", "3학년 이상은 권장 사항입니다. 교수 승인 가능 여부를 확인하세요.");
      return verdict("check", "교수 승인 필요", "학년 권장 조건은 충족하지만 첫 수업에서 담당교수의 승인이 필요합니다.");
    }
  }
];

var savedList = [];
try { savedList = JSON.parse(localStorage.getItem("courseCompassSaved") || "[]"); } catch (_) {}
var state = { filter: "all", openCourse: null, saved: new Set(savedList) };
var form = document.getElementById("profileForm");
var list = document.getElementById("courseList");
var summary = document.getElementById("resultSummary");
var filterButtons = Array.from(document.querySelectorAll(".filter"));

function verdict(status, label, action) { return { status: status, label: label, action: action }; }
function profile() {
  var d = new FormData(form);
  return { major: d.get("major"), year: Number(d.get("year")), track: d.get("track"), attempt: d.get("attempt"), day: Number(d.get("day")) };
}
function esc(v) {
  return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function category(s) { return s === "available" ? "available" : "attention"; }

function courseHtml(c) {
  var open = state.openCourse === c.id;
  var saved = state.saved.has(c.id);
  return '<article class="course-card' + (open ? ' open' : '') + '" data-id="' + esc(c.id) + '">' +
    '<button class="course-summary" aria-expanded="' + open + '">' +
      '<span class="course-name"><strong>' + esc(c.name) + '</strong><span>' + esc(c.code) + ' · ' + esc(c.professor) + '</span></span>' +
      '<span class="course-meta"><strong>' + esc(c.time) + '</strong><span>' + esc(c.room) + '</span></span>' +
      '<span class="badge ' + esc(c.result.status) + '">' + esc(c.result.label) + '</span><span class="chevron">⌄</span>' +
    '</button>' +
    '<div class="course-detail">' +
      '<div class="detail-box evidence"><h3>판정에 사용한 원문</h3><p>' + esc(c.remark) + '</p></div>' +
      '<div><div class="detail-box"><h3>다음 행동</h3><p>' + esc(c.result.action) + '</p></div>' +
      '<div class="course-action"><small>' + esc(c.source) + '</small><button class="save-button' + (saved ? ' saved' : '') + '" data-save="' + esc(c.id) + '">' + (saved ? '저장됨' : '관심 저장') + '</button></div></div>' +
    '</div></article>';
}

function render() {
  var p = profile();
  var evaluated = courses.map(function(c) { return Object.assign({}, c, { result: c.evaluate(p) }); });
  var available = evaluated.filter(function(c) { return c.result.status === "available"; }).length;
  summary.textContent = evaluated.length + "개 분반 중 " + available + "개 신청 가능 · " + (evaluated.length - available) + "개 주의 필요";
  var visible = evaluated.filter(function(c) { return state.filter === "all" || category(c.result.status) === state.filter; });
  list.innerHTML = visible.length ? visible.map(courseHtml).join("") : '<div class="empty-results">이 조건에 해당하는 분반이 없습니다.</div>';
}

form.addEventListener("change", render);
list.addEventListener("click", function(e) {
  var save = e.target.closest("[data-save]");
  if (save) {
    e.stopPropagation();
    var saveId = save.dataset.save;
    if (state.saved.has(saveId)) state.saved.delete(saveId); else state.saved.add(saveId);
    localStorage.setItem("courseCompassSaved", JSON.stringify(Array.from(state.saved)));
    render();
    return;
  }
  var button = e.target.closest(".course-summary");
  if (!button) return;
  var id = button.closest(".course-card").dataset.id;
  state.openCourse = state.openCourse === id ? null : id;
  render();
});
filterButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    state.filter = button.dataset.filter;
    filterButtons.forEach(function(x) { x.classList.toggle("active", x === button); });
    render();
  });
});

var patterns = [
  ["전공 제한", /(주전공|제2전공|복수전공|부전공|타과생|학과|학부)[^.!?\n]*/g],
  ["학년 제한", /([1-4]학년|신입생|학부\s*[1-4]학년\s*이상)[^.!?\n]*/g],
  ["신청 시점", /(장바구니|선착순|[1-3]일차|신청\s*기간)[^.!?\n]*/g],
  ["승인 필요", /(교수|담당자|학과)[^.!?\n]*(승인|허가|문의)[^.!?\n]*/g],
  ["수강 이력", /(재수강|초수강)[^.!?\n]*/g],
  ["선수 조건", /(선수과목|선이수|이수한 학생)[^.!?\n]*/g]
];
function analyze() {
  var input = document.getElementById("remarkInput");
  var output = document.getElementById("analysisOutput");
  var text = input.value.trim();
  if (!text) { output.className = "analysis-output empty"; output.textContent = "검사할 비고 문구를 먼저 입력해 주세요."; input.focus(); return; }
  var findings = [];
  patterns.forEach(function(p) {
    var matches = text.match(p[1]) || [];
    Array.from(new Set(matches)).forEach(function(m) { findings.push([p[0], m.trim()]); });
  });
  output.className = "analysis-output";
  if (!findings.length) {
    output.innerHTML = '<strong>명시적인 제한 표현을 찾지 못했습니다.</strong><p class="uncertain">제한이 없다는 뜻은 아닙니다. 강좌 상세와 개설 학과 공지도 확인하세요.</p>';
    return;
  }
  output.innerHTML = '<ul>' + findings.map(function(f) { return '<li><strong>' + esc(f[0]) + '</strong> · ' + esc(f[1]) + '</li>'; }).join("") + '</ul><p class="uncertain">자동 추출 결과입니다. ‘권장’과 ‘필수’, 날짜별 예외는 원문에서 다시 확인하세요.</p>';
}
document.getElementById("analyzeButton").addEventListener("click", analyze);
document.getElementById("exampleButton").addEventListener("click", function() {
  document.getElementById("remarkInput").value = "선착순 1일차 화학생물공학부 주전공 및 제2전공 2학년만 신청 가능. 타과생은 3일차부터 허용. 재수강생은 담당교수 승인 필요.";
  analyze();
});
document.getElementById("resetButton").addEventListener("click", function() {
  form.reset(); state.filter = "all"; state.openCourse = null;
  filterButtons.forEach(function(x) { x.classList.toggle("active", x.dataset.filter === "all"); });
  document.getElementById("remarkInput").value = "";
  var out = document.getElementById("analysisOutput"); out.className = "analysis-output empty"; out.textContent = "비고를 입력하면 여기에서 핵심 조건을 확인할 수 있습니다.";
  render();
});
render();

function registerAgentTools() {
  if (!document.modelContext || !document.modelContext.registerTool) return;
  try {
    document.modelContext.registerTool({
      name: "set_student_profile",
      title: "학생 조건 설정",
      description: "전공, 학년, 전공 관계, 수강 이력, 신청 시점을 설정하고 화면의 분반 판정을 갱신합니다.",
      inputSchema: {
        type: "object",
        properties: {
          major: { type: "string", enum: ["컴퓨터공학부", "화학생물공학부", "경영학과", "자유전공학부", "그 외 전공"] },
          year: { type: "integer", minimum: 1, maximum: 4 },
          track: { type: "string", enum: ["primary", "double", "minor", "none"] },
          attempt: { type: "string", enum: ["first", "retake"] },
          day: { type: "integer", minimum: 1, maximum: 3 }
        },
        required: ["major", "year", "track", "attempt", "day"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: function(input) {
        var validMajor = ["컴퓨터공학부", "화학생물공학부", "경영학과", "자유전공학부", "그 외 전공"].includes(input.major);
        var validTrack = ["primary", "double", "minor", "none"].includes(input.track);
        var validAttempt = ["first", "retake"].includes(input.attempt);
        if (!validMajor || !validTrack || !validAttempt || ![1,2,3,4].includes(input.year) || ![1,2,3].includes(input.day)) {
          throw new Error("지원하지 않는 학생 조건입니다.");
        }
        form.elements.major.value = input.major;
        form.elements.track.value = input.track;
        form.elements.attempt.value = input.attempt;
        form.querySelector('input[name="year"][value="' + input.year + '"]').checked = true;
        form.querySelector('input[name="day"][value="' + input.day + '"]').checked = true;
        render();
        return { updated: true, profile: profile(), courseCount: courses.length };
      }
    });
  } catch (error) {
    console.warn("WebMCP tool registration failed", error);
  }
}
registerAgentTools();
