"use client";

import { useRef, useState } from "react";
import { Download, FileText, Upload } from "lucide-react";
import { FILE_MAX_BYTES, reviewThesis, submitThesis } from "../lib/rules";
import { useBoard } from "../lib/store";
import type {
  Department,
  Professor,
  Roadmap,
  Student,
  ThesisVersion,
} from "../lib/types";
import { Badge, ErrorMessage, StatusMessage } from "./shared";

function FileDownload({ version }: { version: ThesisVersion }) {
  return (
    <a
      className="button secondary"
      href={version.dataUrl}
      download={version.fileName}
      style={{
        overflowWrap: "anywhere",
        maxWidth: "100%",
        whiteSpace: "normal",
      }}
    >
      <Download size={15} aria-hidden="true" />
      {version.fileName} 다운로드
    </a>
  );
}

function VersionHistory({ versions }: { versions: ThesisVersion[] }) {
  if (versions.length < 2) return null;
  return (
    <details className="feedback">
      <summary>이전 제출 이력 · {versions.length - 1}개 버전</summary>
      {[...versions.slice(0, -1)].reverse().map((version, index) => (
        <div className="request-card" key={version.id}>
          <p>
            <strong>{versions.length - index - 1}차 제출</strong> ·{" "}
            {version.submittedAt.slice(0, 10)} · {version.status}
          </p>
          <FileDownload version={version} />
          {version.feedback && (
            <p style={{ whiteSpace: "pre-wrap" }}>{version.feedback}</p>
          )}
        </div>
      ))}
    </details>
  );
}

export function StudentThesis({
  student,
  department,
  roadmap,
}: {
  student: Student;
  department: Department;
  roadmap: Roadmap;
}) {
  const change = useBoard((state) => state.change);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const versions = roadmap.thesis?.versions ?? [];
  const latest = versions.at(-1);
  const stage = department.stages.find((item) => item.kind === "thesis");
  const current = department.stages[roadmap.currentStage];
  const canSubmit =
    current?.kind === "thesis" &&
    latest?.status !== "승인" &&
    latest?.status !== "검토 대기";

  async function submit() {
    setError("");
    setMessage("");
    if (!file) {
      setError("제출할 최종논문 파일을 선택해 주세요.");
      return;
    }
    if (!file.size || file.size > FILE_MAX_BYTES) {
      setError("파일은 0바이트보다 크고 1MB 이하여야 합니다.");
      return;
    }
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    if (!extension || !["pdf", "docx", "txt"].includes(extension)) {
      setError("PDF, DOCX, TXT 파일만 제출할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("파일을 읽지 못했습니다."));
        reader.onerror = () =>
          reject(new Error("파일을 읽지 못했습니다. 다시 선택해 주세요."));
        reader.readAsDataURL(file);
      });
      const mimeType =
        file.type ||
        (
          {
            pdf: "application/pdf",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            txt: "text/plain",
          } as Record<string, string>
        )[extension];
      change((state) =>
        submitThesis(
          state,
          state.departments,
          student.id,
          department.id,
          { fileName: file.name, mimeType, size: file.size, dataUrl },
          { actor: student.name, at: new Date().toISOString() },
        ),
      );
      setMessage(
        "최종논문을 제출했습니다. 지도교수 화면에서 파일을 확인하고 심사할 수 있습니다.",
      );
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="advisor-section"
      data-testid={`thesis-${department.id}`}
    >
      <div className="section-heading">
        <h3>
          <FileText size={17} aria-hidden="true" /> 최종논문 제출
        </h3>
        <Badge tone={latest?.status === "승인" ? "" : "amber"}>
          {latest?.status ?? "미제출"}
        </Badge>
      </div>
      <p className="muted">
        {stage?.name} · 마감 {stage?.deadline || "정보 확인 필요"}
      </p>
      <p className="small">
        PDF·DOCX·TXT, 최대 1MB. 이 브라우저에 파일이 저장되며 담당 교수가 같은
        데모에서 내려받을 수 있습니다.
      </p>
      {latest && (
        <div className="application-state">
          <p>
            <strong>{versions.length}차 제출</strong> ·{" "}
            {latest.submittedAt.slice(0, 10)} · {Math.ceil(latest.size / 1024)}
            KB
          </p>
          <FileDownload version={latest} />
          {latest.feedback && (
            <div className="feedback" role="status">
              <strong>최종논문 교수 피드백</strong>
              <p style={{ whiteSpace: "pre-wrap" }}>{latest.feedback}</p>
            </div>
          )}
          {latest.status === "승인" && (
            <p className="confirmation">
              최종논문 승인 완료 · 로드맵에 심사 결과가 반영되었습니다.
            </p>
          )}
          {latest.status === "검토 대기" && (
            <p className="muted">지도교수가 제출 파일을 검토하고 있습니다.</p>
          )}
        </div>
      )}
      {canSubmit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label>
            최종논문 파일
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.docx,.txt"
              aria-label="최종논문 파일"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError("");
                setMessage("");
              }}
            />
          </label>
          <button className="button primary" disabled={busy}>
            <Upload size={15} />
            {busy ? "파일 저장 중…" : latest ? "논문 재제출" : "논문 제출"}
          </button>
        </form>
      ) : (
        !latest && (
          <p className="muted">
            앞선 로드맵 단계를 완료하면 최종논문 파일을 제출할 수 있습니다.
          </p>
        )
      )}
      <ErrorMessage message={error} />
      <StatusMessage message={message} />
      <VersionHistory versions={versions} />
    </section>
  );
}

export function ProfessorThesis({
  student,
  department,
  roadmap,
  professor,
}: {
  student: Student;
  department: Department;
  roadmap: Roadmap;
  professor: Professor;
}) {
  const change = useBoard((state) => state.change);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const versions = roadmap.thesis?.versions ?? [];
  const latest = versions.at(-1);
  if (!latest) return null;
  function decide(status: "승인" | "수정 요청" | "반려") {
    try {
      change((state) =>
        reviewThesis(
          state,
          state.departments,
          student.id,
          department.id,
          professor.id,
          status,
          feedback,
          { actor: professor.name, at: new Date().toISOString() },
        ),
      );
      setError("");
      setFeedback("");
      setMessage(`최종논문 ${status} 결과를 학생에게 전달했습니다.`);
    } catch (e) {
      setError((e as Error).message);
      setMessage("");
    }
  }
  return (
    <article
      className="request-card"
      data-testid={`thesis-review-${student.id}`}
    >
      <div className="section-heading">
        <h3>
          {student.name}
          <small>{student.number}</small>
        </h3>
        <Badge tone={latest.status === "승인" ? "" : "amber"}>
          {latest.status}
        </Badge>
      </div>
      <p>
        {department.name} · {versions.length}차 제출 ·{" "}
        {latest.submittedAt.slice(0, 10)}
      </p>
      <FileDownload version={latest} />
      {latest.status === "검토 대기" && (
        <>
          <label>
            논문 심사 피드백
            <textarea
              aria-label={`${student.name} 논문 심사 피드백`}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="수정 요청·반려 사유와 보완할 내용을 입력해 주세요"
            />
          </label>
          <div className="action-row">
            <button className="button primary" onClick={() => decide("승인")}>
              논문 승인
            </button>
            <button
              className="button secondary"
              onClick={() => decide("수정 요청")}
            >
              논문 수정 요청
            </button>
            <button className="button danger" onClick={() => decide("반려")}>
              논문 반려
            </button>
          </div>
        </>
      )}
      {latest.feedback && (
        <div className="feedback">
          <strong>전달한 논문 피드백</strong>
          <p style={{ whiteSpace: "pre-wrap" }}>{latest.feedback}</p>
        </div>
      )}
      <ErrorMessage message={error} />
      <StatusMessage message={message} />
      <VersionHistory versions={versions} />
    </article>
  );
}
