import { AlertCircle, ExternalLink, CheckCircle2, Clock3 } from "lucide-react";
import { info, methodLabels } from "../lib/rules";
import type { Department, History, Stage, Student } from "../lib/types";
export function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function OfficialLink({ value }: { value?: string }) {
  return value && /^https?:\/\//.test(value) ? (
    <a href={value} target="_blank" rel="noreferrer">
      공식 공지 <ExternalLink size={13} />
    </a>
  ) : (
    <span>{info(value)}</span>
  );
}
export function DepartmentGuide({ department: d }: { department: Department }) {
  return (
    <div className="department-guide">
      <div className="section-heading">
        <h3>{d.name} 절차 안내</h3>
        {d.source !== "실제 공지" && <Badge tone="amber">예시 데이터</Badge>}
      </div>
      <p>{d.sourceDescription}</p>
      <dl className="detail-grid">
        <div>
          <dt>적용 학기</dt>
          <dd>{info(d.semester)}</dd>
        </div>
        <div>
          <dt>요건</dt>
          <dd>
            주전공 {info(d.requirements.primary)} · 복수전공{" "}
            {info(d.requirements.secondary)}
          </dd>
        </div>
        <div>
          <dt>지도교수 결정 방식</dt>
          <dd>{methodLabels[d.advisorMethod]}</dd>
        </div>
        <div>
          <dt>공식 링크</dt>
          <dd>
            <OfficialLink value={d.officialLink} />
          </dd>
        </div>
      </dl>
      <small className="muted">
        출처: {d.source} · 확인일: {info(d.verifiedAt)}
      </small>
    </div>
  );
}
export function StageDetails({ stage: s }: { stage: Stage }) {
  return (
    <div className="stage-details">
      <p>{s.description}</p>
      <dl className="detail-grid">
        <div>
          <dt>마감일</dt>
          <dd>{info(s.deadline)}</dd>
        </div>
        <div>
          <dt>제출 방법</dt>
          <dd>{info(s.submission)}</dd>
        </div>
        <div>
          <dt>제출 서류</dt>
          <dd>
            {s.documents.length ? s.documents.join(", ") : "정보 확인 필요"}
          </dd>
        </div>
        <div>
          <dt>증빙 방식</dt>
          <dd>{info(s.evidence)}</dd>
        </div>
      </dl>
      <p>
        <strong>유의사항</strong> {info(s.notice)}
      </p>
      <p>
        <strong>문의처</strong> {info(s.contact)}
      </p>
      <details className="form-details">
        <summary>서식 안내 보기</summary>
        <p>{info(s.form)}</p>
        <small>
          최종논문은 실제 파일을 브라우저에 저장해 지도교수에게 제공합니다. 다른
          서류는 제출 상태를 기록합니다.
        </small>
      </details>
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div className="alert error" role="alert">
      <AlertCircle size={18} />
      {message}
    </div>
  ) : null;
}
export function StatusMessage({ message }: { message: string }) {
  return message ? (
    <div className="alert success" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  ) : null;
}
export function HistoryList({
  events,
  students,
}: {
  events: History[];
  students: Student[];
}) {
  return (
    <section className="panel" id="history">
      <div className="section-heading">
        <h2>변경 이력</h2>
        <Badge>{events.length}건</Badge>
      </div>
      {events.length ? (
        <div className="history-list">
          {events.map((h) => (
            <div key={h.id} className="history-row">
              <Clock3 size={15} />
              <div>
                <p>{h.content}</p>
                <small>
                  {h.actor}
                  {h.studentId
                    ? ` · ${students.find((s) => s.id === h.studentId)?.name ?? ""}`
                    : ""}{" "}
                  ·{" "}
                  {new Date(h.at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">아직 변경 이력이 없습니다.</p>
      )}
    </section>
  );
}
