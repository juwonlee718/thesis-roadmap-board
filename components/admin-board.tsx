"use client";
import { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Megaphone,
  Search,
  Users,
} from "lucide-react";
import { useBoard } from "../lib/store";
import { publishAnnouncement, remaining } from "../lib/rules";
import type { Department, Roadmap, Student } from "../lib/types";
import { Badge, ErrorMessage, HistoryList, StatusMessage } from "./shared";
import { DepartmentEditor } from "./department-editor";

export function AdminBoard() {
  const { data } = useBoard();
  const [filter, setFilter] = useState("all");
  const [academicStatus, setAcademicStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const students = data.students.filter(
    (student) =>
      (filter === "all" ||
        student.majors.some((major) => major.departmentId === filter)) &&
      (academicStatus === "all" ||
        (academicStatus === "target"
          ? student.academicStatus !== "재학"
          : student.academicStatus === academicStatus)) &&
      `${student.name} ${student.number}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const maxPage = Math.max(1, Math.ceil(students.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const visibleStudents = students.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const relevantStudents = data.students.filter(
    (student) =>
      filter === "all" ||
      student.majors.some((major) => major.departmentId === filter),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">학과 조교 워크스페이스</div>
          <h1>
            학과의 절차를 한곳에서<span className="heading-dot">.</span>
          </h1>
          <p>
            졸업논문 절차와 공지를 관리하고, 소속 학생의 준비 상황을 확인하세요.
          </p>
        </div>
      </div>
      <div className="summary-strip">
        <div>
          <Users size={21} />
          <span>학과 소속 학생</span>
          <strong>
            {relevantStudents.length}
            <small>명</small>
          </strong>
        </div>
        <div>
          <GraduationCap size={21} />
          <span>졸업·초과학기</span>
          <strong>
            {
              relevantStudents.filter(
                (student) => student.academicStatus !== "재학",
              ).length
            }
            <small>명</small>
          </strong>
        </div>
        <div>
          <BookOpen size={21} />
          <span>관리 중인 절차</span>
          <strong>
            {filter === "all" ? data.departments.length : 1}
            <small>개 학과</small>
          </strong>
        </div>
      </div>
      <section className="panel" id="students">
        <div className="section-heading">
          <h2>전체 학생 조회</h2>
          <Badge tone="amber">예시 데이터</Badge>
        </div>
        <p className="muted small">
          전공 설정 전 학생과 논문 면제 학생을 포함해 학과 소속 학생 전체를
          조회합니다. 학생을 펼치면 전공별 진행 상황을 볼 수 있습니다.
        </p>
        <div className="grid gap-x-4 md:grid-cols-3">
          <label className="md:col-span-3">
            학생 검색
            <div className="relative">
              <Search
                className="absolute right-3 top-3 text-slate-400"
                size={18}
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="이름 또는 학번 검색"
                className="pr-10!"
              />
            </div>
          </label>
          <label>
            학과별 필터
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">전체 학과</option>
              {data.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            학적 필터
            <select
              value={academicStatus}
              onChange={(event) => {
                setAcademicStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">전체 학적</option>
              <option value="target">졸업·초과학기</option>
              <option>졸업학기</option>
              <option>초과학기</option>
              <option>재학</option>
            </select>
          </label>
          <label>
            페이지당 학생 수
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10명씩 보기</option>
              <option value={20}>20명씩 보기</option>
            </select>
          </label>
        </div>
        <div className="section-heading">
          <p className="small" role="status">
            검색 결과 <strong>{students.length}명</strong>
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setFilter("all");
              setAcademicStatus("all");
              setPage(1);
            }}
          >
            필터 초기화
          </button>
        </div>
        <div className="admin-records">
          {visibleStudents.map((student) => (
            <article
              className="admin-record"
              key={student.id}
              data-testid={`student-row-${student.id}`}
            >
              <div className="section-heading flex-wrap">
                <h3>
                  {student.name}
                  <small>
                    {student.number} · {student.graduation} 졸업 예정
                  </small>
                </h3>
                <Badge
                  tone={
                    student.academicStatus === "초과학기" ? "amber" : "blue"
                  }
                >
                  {student.academicStatus}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {student.majors.map((major) => {
                  const department = data.departments.find(
                    (item) => item.id === major.departmentId,
                  );
                  return (
                    <span className="badge neutral" key={major.departmentId}>
                      {department?.name ?? "정보 확인 필요"} ·{" "}
                      {major.type === "primary" ? "주전공" : "복수전공"}
                      {department?.requirements[major.type] === "면제"
                        ? " · 논문 면제"
                        : ""}
                    </span>
                  );
                })}
                {!student.configured && (
                  <Badge tone="amber">전공 설정 전</Badge>
                )}
              </div>
              <button
                className="button secondary"
                aria-expanded={expanded === student.id}
                aria-controls={`student-detail-${student.id}`}
                onClick={() =>
                  setExpanded(expanded === student.id ? null : student.id)
                }
              >
                {expanded === student.id
                  ? "진행 현황 접기"
                  : "전공별 진행 현황 보기"}
              </button>
              {expanded === student.id && (
                <div
                  className="mt-4 grid gap-3"
                  id={`student-detail-${student.id}`}
                >
                  {!student.configured && (
                    <p className="muted small">
                      학생이 전공을 확인하면 로드맵이 생성됩니다. 소속 학과
                      명단에는 포함되어 있습니다.
                    </p>
                  )}
                  {student.majors
                    .filter(
                      (major) =>
                        filter === "all" || major.departmentId === filter,
                    )
                    .map((major) => {
                      const department = data.departments.find(
                        (item) => item.id === major.departmentId,
                      );
                      const roadmap = student.roadmaps.find(
                        (item) => item.departmentId === major.departmentId,
                      );
                      if (!department) return null;
                      if (department.requirements[major.type] === "면제")
                        return (
                          <div className="exempt-row" key={department.id}>
                            <strong>{department.name}</strong>
                            <Badge>논문 면제</Badge>
                          </div>
                        );
                      return roadmap ? (
                        <StudentRecord
                          key={department.id}
                          student={student}
                          roadmap={roadmap}
                          department={department}
                        />
                      ) : (
                        <p className="small muted" key={department.id}>
                          {department.name} · 로드맵 생성 전
                        </p>
                      );
                    })}
                </div>
              )}
            </article>
          ))}
        </div>
        {!students.length && (
          <p className="empty">
            조건에 맞는 학생이 없습니다. 검색어나 필터를 변경해 주세요.
          </p>
        )}
        <nav
          aria-label="학생 목록 페이지"
          className="action-row items-center justify-center"
        >
          <button
            className="button secondary"
            disabled={currentPage === 1}
            onClick={() => {
              setPage(currentPage - 1);
              setExpanded(null);
            }}
          >
            이전
          </button>
          <span className="small">
            {currentPage} / {maxPage} 페이지
          </span>
          <button
            className="button secondary"
            disabled={currentPage === maxPage}
            onClick={() => {
              setPage(currentPage + 1);
              setExpanded(null);
            }}
          >
            다음
          </button>
        </nav>
      </section>
      <DepartmentEditor />
      <AnnouncementEditor />
      <section className="panel" id="capacity">
        <div className="section-heading">
          <h2>교수별 지도 현황</h2>
          <span className="muted">정원은 교수 화면에서 관리합니다</span>
        </div>
        <div className="capacity-grid">
          {data.professors
            .filter(
              (professor) =>
                filter === "all" || professor.departmentId === filter,
            )
            .map((professor) => {
              const department = data.departments.find(
                (item) => item.id === professor.departmentId,
              );
              return (
                <article key={professor.id}>
                  <div>
                    <strong>{professor.name}</strong>
                    <small>{department?.name}</small>
                  </div>
                  {department?.usesCapacity ? (
                    <>
                      <Badge tone={remaining(professor) > 0 ? "blue" : "amber"}>
                        {remaining(professor) > 0
                          ? `남은 자리 ${remaining(professor)}명`
                          : "정원 마감"}
                      </Badge>
                      <p>
                        {professor.assigned}명 배정 / {professor.capacity}명
                        정원
                      </p>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${professor.capacity ? Math.min(100, (professor.assigned / professor.capacity) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="muted">정원 미적용</p>
                  )}
                </article>
              );
            })}
        </div>
      </section>
      <HistoryList
        events={data.history.filter(
          (event) => filter === "all" || event.departmentId === filter,
        )}
        students={data.students}
      />
    </>
  );
}

function StudentRecord({
  student,
  roadmap,
  department,
}: {
  student: Student;
  roadmap: Roadmap;
  department: Department;
}) {
  const { data } = useBoard();
  const application = roadmap.application;
  const current = department.stages[roadmap.currentStage];
  const enrollment = student.courseEnrollments.find(
    (item) => item.departmentId === department.id,
  );
  const professorId = application?.professorId ?? enrollment?.professorId;
  const professor = data.professors.find((item) => item.id === professorId);
  const latestThesis = roadmap.thesis?.versions.at(-1);
  return (
    <section
      className="admin-record"
      data-testid={`admin-${student.id}-${department.id}`}
    >
      <div className="section-heading">
        <h3>{department.name}</h3>
        <Badge
          tone={application?.status === "승인" || enrollment ? "blue" : "amber"}
        >
          {enrollment ? "수강 수업 연계" : (application?.status ?? "미신청")}
        </Badge>
      </div>
      <div className="record-overview">
        <p>
          <span>현재 단계</span>
          <strong>{current?.name ?? "전체 완료"}</strong>
        </p>
        <p>
          <span>지도교수</span>
          <strong>{professor?.name ?? "미확정"}</strong>
        </p>
        <p>
          <span>완료한 단계</span>
          <strong>
            {roadmap.completed.length} / {department.stages.length}
          </strong>
        </p>
        <p>
          <span>다음 마감</span>
          <strong>
            {current?.deadline || (current ? "정보 확인 필요" : "전체 완료")}
          </strong>
        </p>
      </div>
      {enrollment && (
        <p className="small muted">
          수강 정보: {enrollment.courseName} · 지도교수는 수강 수업과
          연결됩니다.
        </p>
      )}
      {latestThesis && (
        <div className="feedback">
          <p>
            <strong>최종 논문 심사</strong> · {latestThesis.status}
          </p>
          <p>
            {latestThesis.fileName} · {roadmap.thesis?.versions.length}차 제출
          </p>
          {latestThesis.feedback && <p>교수 피드백: {latestThesis.feedback}</p>}
        </div>
      )}
      <details>
        <summary>진행 단계와 신청 내용</summary>
        <ol className="compact-stages">
          {department.stages.map((stage, index) => (
            <li key={stage.id}>
              <span>{stage.name}</span>
              <span>
                {roadmap.completed.includes(stage.id)
                  ? "완료"
                  : index === roadmap.currentStage
                    ? "진행 중"
                    : "예정"}{" "}
                · {stage.deadline || "정보 확인 필요"}
              </span>
            </li>
          ))}
        </ol>
        {application && (
          <div className="feedback">
            <p>연구 주제: {application.topic}</p>
            <p>연구계획: {application.plan}</p>
            <p>신청일: {application.requestedAt.slice(0, 10)}</p>
            {application.feedback && <p>교수 피드백: {application.feedback}</p>}
          </div>
        )}
      </details>
    </section>
  );
}

function AnnouncementEditor() {
  const { data, change } = useBoard();
  const [departmentId, setDepartmentId] = useState(
    data.departments[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const announcements = data.announcements.filter(
    (item) => item.departmentId === departmentId,
  );
  return (
    <section className="panel" id="announcements">
      <div className="section-heading">
        <h2>학과 공지사항</h2>
        <Megaphone size={20} />
      </div>
      <p className="muted small">
        등록한 공지는 해당 학과를 전공하는 학생 화면에 표시됩니다.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            change((state) =>
              publishAnnouncement(
                state,
                { departmentId, title, body },
                { actor: "가상 학과 조교", at: new Date().toISOString() },
              ),
            );
            setTitle("");
            setBody("");
            setError("");
            setMessage(
              "공지를 등록했습니다. 해당 학과 학생 화면에 반영되었습니다.",
            );
          } catch (exception) {
            setError((exception as Error).message);
            setMessage("");
          }
        }}
      >
        <label>
          공지 대상 학과
          <select
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value);
              setMessage("");
              setError("");
            }}
          >
            {data.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          공지 제목
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="일정 변경이나 제출 안내를 적어 주세요"
          />
        </label>
        <label>
          공지 내용
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
          />
        </label>
        <button type="submit" className="button primary">
          공지 등록
        </button>
        <ErrorMessage message={error} />
        <StatusMessage message={message} />
      </form>
      <div className="mt-6 grid gap-3">
        {announcements.map((announcement) => (
          <article className="admin-record" key={announcement.id}>
            <h3>{announcement.title}</h3>
            <p className="small whitespace-pre-wrap break-words mt-2">
              {announcement.body}
            </p>
            <small className="muted">
              {announcement.author} ·{" "}
              {new Date(announcement.createdAt).toLocaleDateString("ko-KR")}
            </small>
          </article>
        ))}
        {!announcements.length && (
          <p className="empty">아직 등록한 공지가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
