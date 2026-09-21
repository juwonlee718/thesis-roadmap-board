const app = {
  role: "admin", taskFilter: "all",
  capacities: [
    { name: "교수 A", field: "로봇·제어", used: 4, total: 4 },
    { name: "교수 B", field: "열유체", used: 3, total: 5 },
    { name: "교수 C", field: "고체역학", used: 2, total: 3 },
    { name: "교수 D", field: "설계·생산", used: 1, total: 4 }
  ],
  tasks: [
    { initials: "A", name: "학생 A", meta: "학번 비공개 · 복수전공", reason: "희망 교수 정원 초과", status: "미배정", tone: "bad", due: "오늘까지", action: "배정 조정" },
    { initials: "B", name: "학생 B", meta: "학번 비공개 · 주전공", reason: "지도교수 승인 대기 4일", status: "승인 대기", tone: "wait", due: "D-2", action: "확인 요청" },
    { initials: "C", name: "학생 C", meta: "학번 비공개 · 주전공", reason: "연구계획서 서명 누락", status: "보완 필요", tone: "warn", due: "D-3", action: "보완 요청" },
    { initials: "D", name: "학생 D", meta: "학번 비공개 · 복수전공", reason: "최종본 접수 확인 필요", status: "접수 대기", tone: "wait", due: "D-5", action: "접수 확인" }
  ]
};

const navByRole = {
  admin: [["▦","전체 현황","12"],["◎","처리할 업무","4"],["♙","지도교수 배정","3"],["▤","학생 진행 관리",""],["▣","서류 접수·보완","7"],["◷","일정·공지 관리",""],["⇩","결과 취합",""],["↺","변경 이력",""]],
  professor: [["▦","내 지도 현황",""],["♙","지도 신청","2"],["▤","연구계획서 검토","3"],["✓","논문 심사","4"],["◷","주요 일정",""]],
  student: [["▦","나의 현황",""],["♙","지도교수 신청",""],["▤","제출 서류","2"],["◷","전체 일정",""],["⌕","학과별 요건",""]]
};
const names = { admin: "기계공학부 행정실", professor: "교수 A · 기계공학부", student: "학생 A · 기계공학부" };

function metric(label, value, note, tint) {
  return `<article class="metric" style="--tint:${tint}"><div class="metric-top">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`;
}
function renderNav() {
  const nav = document.querySelector("#sideNav");
  const label = app.role === "admin" ? "행정 업무" : app.role === "professor" ? "지도·심사" : "졸업논문";
  nav.innerHTML = `<span class="nav-label">${label}</span>` + navByRole[app.role].map((item, i) => `<button class="nav-item ${i === 0 ? "active" : ""}"><span class="nav-icon">${item[0]}</span>${item[1]}${item[2] ? `<span class="nav-badge">${item[2]}</span>` : ""}</button>`).join("");
  nav.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
    nav.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    button.classList.add("active"); showToast(`${button.textContent.trim()} 화면은 시연 범위에서 요약으로 제공합니다.`);
  }));
}
function renderTasks() {
  const visible = app.tasks.filter(task => app.taskFilter === "all" || (app.taskFilter === "assignment" ? ["미배정","승인 대기"].includes(task.status) : !["미배정","승인 대기"].includes(task.status)));
  return visible.map((task, i) => `<div class="task-row"><span class="initial">${task.initials}</span><div><div class="student-name">${task.name}</div><div class="student-meta">${task.meta}</div></div><div class="reason">${task.reason}</div><div><span class="status ${task.tone}">${task.status}</span><div class="student-meta">${task.due}</div></div><button class="btn small ${i === 0 ? "danger" : ""}" data-task="${task.name}">${task.action}</button></div>`).join("") || `<div class="empty-note">해당하는 업무가 없습니다.</div>`;
}
function renderCapacities() {
  return app.capacities.map(item => `<div class="capacity-row"><div class="capacity-title"><strong>${item.name}</strong><span>${item.field} · ${item.used}/${item.total}명</span></div><div class="bar"><i class="${item.used >= item.total ? "full" : ""}" style="width:${Math.min(100, item.used / item.total * 100)}%"></i></div><div class="capacity-foot"><span>확정 ${item.used}명</span><span>${item.total - item.used > 0 ? `잔여 ${item.total - item.used}명` : "정원 마감"}</span></div></div>`).join("");
}

function adminView() {
  return `<section class="page-head"><div><p class="eyebrow">Administration dashboard</p><h1>졸업논문 운영 현황</h1><p class="page-desc">미배정과 누락부터 확인하고, 교수별 지도 정원을 조정하세요. 모든 인물은 가상입니다.</p></div><div class="head-actions"><button class="btn" data-toast="공지·서식 관리 화면을 엽니다.">공지·서식 관리</button><button class="btn primary" data-toast="새 일정 등록 화면을 엽니다.">+ 일정 등록</button></div></section>
  <section class="metric-grid">${metric("대상 학생","48명","주전공 35 · 복수전공 13","#eef2ff")}${metric("지도교수 미확정","3명",`<span class="up">지난주보다 1명 증가</span>`,"#ffebe9")}${metric("서류 보완 필요","7건","계획서 4 · 승인서 3","#fff4df")}${metric("최종 완료","21명","전체 대상자의 44%","#e5f7f1")}</section>
  <section class="content-grid"><div class="stack"><article class="panel"><div class="panel-head"><div><h2>지금 처리할 업무</h2><p>마감과 지연 기간을 기준으로 정렬했습니다.</p></div><div class="segmented"><button class="active" data-filter="all">전체</button><button data-filter="assignment">배정</button><button data-filter="document">서류</button></div></div><div class="task-list" id="taskList">${renderTasks()}</div></article>
  <article class="panel table-panel"><div class="panel-head"><div><h2>학생별 진행 현황</h2><p>학술 심사와 행정 접수 상태를 따로 확인합니다.</p></div><button class="link-button" data-toast="48명 전체 명단을 표시합니다.">전체 48명 보기 →</button></div><table class="data-table"><thead><tr><th>학생</th><th>전공 구분</th><th>지도교수</th><th>계획서</th><th>논문 심사</th><th>행정 접수</th></tr></thead><tbody>
  <tr><td><strong>학생 E</strong><br><span class="student-meta">학번 비공개</span></td><td>주전공</td><td>교수 B</td><td><span class="status good">확인</span></td><td><span class="status good">합격</span></td><td><span class="status warn">최종본 대기</span></td></tr>
  <tr><td><strong>학생 F</strong><br><span class="student-meta">학번 비공개</span></td><td>복수전공</td><td>교수 C</td><td><span class="status good">확인</span></td><td><span class="status wait">심사 중</span></td><td><span class="status wait">대기</span></td></tr>
  <tr><td><strong>학생 A</strong><br><span class="student-meta">학번 비공개</span></td><td>복수전공</td><td>미정</td><td><span class="status wait">작성 전</span></td><td>—</td><td>—</td></tr></tbody></table></article></div>
  <div class="stack"><article class="panel"><div class="panel-head"><div><h2>교수별 지도 정원</h2><p>신청 인원과 확정 인원을 구분해 관리합니다.</p></div><button class="link-button" data-toast="교수별 정원 수정 화면을 엽니다.">정원 관리</button></div><div class="capacity-list">${renderCapacities()}</div></article>
  <article class="panel"><div class="panel-head"><div><h2>이번 주 일정</h2><p>학생·교수 화면에도 같은 일정이 표시됩니다.</p></div></div><div class="timeline"><div class="timeline-item done"><i class="dot"></i><div><div class="timeline-title">희망 지도교수 신청 마감</div><div class="timeline-meta">신청 45명 · 미신청 3명</div></div><span class="date">9.18</span></div><div class="timeline-item"><i class="dot"></i><div><div class="timeline-title">지도교수 배정 확정</div><div class="timeline-meta">정원 초과 1건 조정 필요</div></div><span class="date">9.25</span></div><div class="timeline-item future"><i class="dot"></i><div><div class="timeline-title">연구계획서 제출</div><div class="timeline-meta">지도교수 승인 포함</div></div><span class="date">10.16</span></div></div></article></div></section>`;
}

function professorView() {
  return `<section class="page-head"><div><p class="eyebrow">Professor dashboard</p><h1>교수 A의 지도 현황</h1><p class="page-desc">학생 신청을 검토하고 계획서·논문 심사를 한곳에서 처리하세요. 가상 데이터입니다.</p></div><div class="head-actions"><button class="btn" data-toast="이번 학기 지도 정원 변경을 요청했습니다.">정원 변경 요청</button></div></section>
  <section class="metric-grid">${metric("지도 정원","4명","확정 4 · 잔여 0","#ffebe9")}${metric("신규 신청","2건","확인 대기","#fff4df")}${metric("계획서 검토","3건","가장 오래된 대기 4일","#f2edff")}${metric("논문 심사","4건","12월 14일까지","#e5f7f1")}</section>
  <section class="content-grid"><article class="panel"><div class="panel-head"><div><h2>지도 신청 검토</h2><p>수락 전에 현재 정원과 학생의 연구 주제를 확인합니다.</p></div></div><div class="task-list"><div class="task-row"><span class="initial">B</span><div><div class="student-name">학생 B</div><div class="student-meta">주전공 · 1순위 신청</div></div><div class="reason">휴머노이드 보행 제어</div><div><span class="status wait">검토 대기</span></div><button class="btn small" data-toast="현재 정원이 가득 차 있어 행정실 조정이 필요합니다.">검토하기</button></div><div class="task-row"><span class="initial">G</span><div><div class="student-name">학생 G</div><div class="student-meta">복수전공 · 2순위 신청</div></div><div class="reason">협동 로봇 안전 제어</div><div><span class="status wait">검토 대기</span></div><button class="btn small" data-toast="신청 상세 내용을 표시합니다.">검토하기</button></div></div></article>
  <div class="stack"><article class="panel"><div class="panel-head"><div><h2>내 지도 학생</h2><p>현재 4명 · 정원 마감</p></div></div><ul class="checklist"><li><span class="checkmark">✓</span>학생 H · 계획서 승인<small>완료</small></li><li><span class="checkmark pending">!</span>학생 I · 초고 검토<small>D-2</small></li><li><span class="checkmark">✓</span>학생 J · 계획서 승인<small>완료</small></li><li><span class="checkmark pending">!</span>학생 K · 면담 기록<small>대기</small></li></ul></article></div></section>`;
}

function studentView() {
  return `<section class="page-head"><div><p class="eyebrow">Student dashboard</p><h1>학생 A의 졸업논문</h1><p class="page-desc">기계공학부 복수전공 · 2027년 2월 졸업 예정 · 가상 데이터</p></div><div class="head-actions"><button class="btn" data-toast="학과 원문 공지를 새 창에서 확인할 수 있습니다.">원문 공지 확인</button></div></section>
  <section class="metric-grid">${metric("현재 단계","지도교수 배정","1순위 정원 초과로 조정 중","#ffebe9")}${metric("다음 마감","D-4","연구계획서 초안 · 9월 25일","#fff4df")}${metric("완료한 단계","2 / 7","졸업신청 · 주제 제출","#e5f7f1")}${metric("확인할 알림","2건","배정 결과 · 서류 보완","#f2edff")}</section>
  <section class="content-grid"><article class="panel"><div class="panel-head"><div><h2>나의 진행 단계</h2><p>완료 여부는 전공별로 따로 관리됩니다.</p></div></div><div class="timeline"><div class="timeline-item done"><i class="dot"></i><div><div class="timeline-title">졸업논문 대상 확인</div><div class="timeline-meta">복수전공 기준 확인 완료</div></div><span class="date">완료</span></div><div class="timeline-item done"><i class="dot"></i><div><div class="timeline-title">주제·희망 교수 신청</div><div class="timeline-meta">1순위 교수 A · 2순위 교수 B</div></div><span class="date">9.18</span></div><div class="timeline-item"><i class="dot"></i><div><div class="timeline-title">지도교수 배정</div><div class="timeline-meta">1순위 정원 초과 · 행정실 조정 중</div></div><span class="date">9.25</span></div><div class="timeline-item future"><i class="dot"></i><div><div class="timeline-title">연구계획서 승인·제출</div><div class="timeline-meta">배정 후 지도교수 승인 필요</div></div><span class="date">10.16</span></div><div class="timeline-item future"><i class="dot"></i><div><div class="timeline-title">논문 심사 및 최종본 제출</div><div class="timeline-meta">심사 합격과 행정 접수는 별도 확인</div></div><span class="date">12.14</span></div></div></article>
  <div class="stack"><article class="panel"><div class="panel-head"><div><h2>지도교수 신청</h2><p>행정실에서 최종 배정 중입니다.</p></div></div><ul class="checklist"><li><span class="checkmark pending">1</span>교수 A · 로봇·제어<small>정원 4/4</small></li><li><span class="checkmark">2</span>교수 B · 열유체<small>정원 3/5</small></li></ul></article><article class="panel"><div class="panel-head"><div><h2>제출 서류</h2></div></div><ul class="checklist"><li><span class="checkmark">✓</span>주제 및 개요<small>제출 완료</small></li><li><span class="checkmark pending">!</span>지도교수 승인서<small>배정 후 제출</small></li></ul></article></div></section>`;
}

function bindTaskActions() {
  document.querySelectorAll("[data-task]").forEach(button => button.addEventListener("click", () => {
    const task = app.tasks.find(item => item.name === button.dataset.task); if (!task) return;
    if (task.status === "미배정") { task.reason = "교수 B에게 재배정 제안"; task.status = "조정 중"; task.tone = "wait"; task.action = "상세 보기"; showToast("잔여 정원이 있는 교수 B에게 재배정을 제안했습니다."); }
    else if (task.status === "승인 대기") { task.reason = "교수에게 확인 요청 발송"; task.due = "방금"; showToast("지도교수에게 확인 요청을 보냈습니다."); }
    else if (task.status === "보완 필요") { task.reason = "학생에게 보완 요청 발송"; task.due = "방금"; showToast("서명 누락 보완 요청을 보냈습니다."); }
    else { task.status = "접수 완료"; task.tone = "good"; task.action = "완료"; task.due = "방금"; showToast("최종본 접수를 확인했습니다."); }
    document.querySelector("#taskList").innerHTML = renderTasks(); bindTaskActions();
  }));
}
function bindActions() {
  document.querySelectorAll("[data-toast]").forEach(button => button.addEventListener("click", () => showToast(button.dataset.toast)));
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => { app.taskFilter = button.dataset.filter; document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button)); document.querySelector("#taskList").innerHTML = renderTasks(); bindTaskActions(); }));
  bindTaskActions();
}
function render() {
  document.querySelectorAll(".role-button").forEach(button => button.classList.toggle("active", button.dataset.role === app.role));
  document.querySelector("#userName").textContent = names[app.role]; document.querySelector(".avatar").textContent = app.role === "admin" ? "행" : app.role === "professor" ? "교" : "학";
  renderNav(); document.querySelector("#mainContent").innerHTML = app.role === "admin" ? adminView() : app.role === "professor" ? professorView() : studentView(); bindActions();
}
let toastTimer;
function showToast(message) { const toast = document.querySelector("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600); }
document.querySelectorAll(".role-button").forEach(button => button.addEventListener("click", () => { app.role = button.dataset.role; app.taskFilter = "all"; render(); document.querySelector("#mainContent").focus(); }));
render();
