"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save } from "lucide-react";
import { useBoard } from "../lib/store";
import { updateDepartment } from "../lib/rules";
import type { Department, Stage } from "../lib/types";
import { Badge, ErrorMessage, StatusMessage } from "./shared";

export function DepartmentEditor() {
  const { data } = useBoard();
  const [departmentId, setDepartmentId] = useState(
    data.departments[0]?.id ?? "",
  );
  const department = data.departments.find((item) => item.id === departmentId);
  return (
    <section className="panel" id="department-editor">
      <div className="section-heading">
        <div>
          <div className="eyebrow">학과 절차 관리</div>
          <h2>학생 로드맵 편집</h2>
        </div>
        <Badge tone="blue">조교 워크스페이스</Badge>
      </div>
      <p className="muted small">
        학과 절차의 순서와 마감, 제출 안내를 수정하세요. 저장한 내용은 학생의
        로드맵과 통합 캘린더에 함께 반영됩니다.
      </p>
      <label>
        편집할 학과
        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          {data.departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {department && (
        <DepartmentForm key={department.id} department={department} />
      )}
    </section>
  );
}

function DepartmentForm({ department }: { department: Department }) {
  const { change } = useBoard();
  const [draft, setDraft] = useState<Department>(() =>
    structuredClone(department),
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const currentContent = JSON.stringify(department);
  const [baseContent, setBaseContent] = useState(currentContent);
  const hasConflict = dirty && currentContent !== baseContent;
  useEffect(() => {
    if (!dirty && currentContent !== baseContent) {
      setDraft(JSON.parse(currentContent) as Department);
      setBaseContent(currentContent);
    }
  }, [currentContent, baseContent, dirty]);
  function reloadDepartment() {
    setDraft(JSON.parse(currentContent) as Department);
    setBaseContent(currentContent);
    setDirty(false);
    setError("");
    setMessage("최신 학과 절차를 불러왔습니다. 다시 편집해 주세요.");
  }
  function patchStage(id: string, patch: Partial<Stage>) {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((stage) =>
        stage.id === id ? { ...stage, ...patch } : stage,
      ),
    }));
    setDirty(true);
    setMessage("");
  }
  function moveStage(index: number, offset: number) {
    setDraft((current) => {
      const stages = [...current.stages];
      [stages[index], stages[index + offset]] = [
        stages[index + offset],
        stages[index],
      ];
      return { ...current, stages };
    });
    setDirty(true);
    setMessage("");
  }
  function addStage() {
    setDraft((current) => ({
      ...current,
      stages: [
        ...current.stages,
        {
          id: `stage-${crypto.randomUUID()}`,
          name: "새 단계",
          description: "",
          deadline: "",
          documents: [],
          form: "",
          submission: "시스템",
          evidence: "",
          notice: "",
          contact: "",
          kind: "submission",
        },
      ],
    }));
    setDirty(true);
    setMessage("");
  }
  function save() {
    try {
      change((state) => {
        const latest = state.departments.find((item) => item.id === draft.id);
        if (JSON.stringify(latest) !== baseContent) {
          throw new Error(
            "다른 화면에서 학과 절차가 변경되었습니다. 최신 절차를 불러온 후 다시 편집해 주세요.",
          );
        }
        return updateDepartment(state, draft, {
          actor: "가상 학과 조교",
          at: new Date().toISOString(),
        });
      });
      setBaseContent(JSON.stringify(draft));
      setError("");
      setMessage(
        "학과 절차를 저장했습니다. 학생 로드맵과 캘린더에 반영되었습니다.",
      );
      setDirty(false);
    } catch (exception) {
      setError((exception as Error).message);
      setMessage("");
    }
  }
  return (
    <div>
      <div className="section-heading">
        <p>
          <strong>{draft.name}</strong> · {draft.stages.length}개 단계
        </p>
        {department.source !== "실제 공지" && (
          <Badge tone="amber">예시 데이터</Badge>
        )}
      </div>
      {hasConflict && (
        <div className="alert error flex-wrap" role="alert">
          <p>
            다른 화면에서 이 학과 절차가 변경되었습니다. 현재 입력은 보존되어
            있으며, 충돌을 방지하기 위해 저장을 중지했습니다.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={reloadDepartment}
          >
            현재 입력을 버리고 최신 절차 불러오기
          </button>
        </div>
      )}
      <label>
        적용 학기
        <input
          value={draft.semester}
          onChange={(event) => {
            setDraft({ ...draft, semester: event.target.value });
            setDirty(true);
          }}
        />
      </label>
      <div className="admin-records">
        {draft.stages.map((stage, index) => (
          <details
            className="admin-record"
            key={stage.id}
            data-testid={`edit-stage-${stage.id}`}
          >
            <summary>
              {index + 1}. {stage.name || "이름 없는 단계"}
              <span className="muted small">
                {" "}
                · {stage.deadline || "정보 확인 필요"}
              </span>
            </summary>
            {!department.stages.some(
              (savedStage) => savedStage.id === stage.id,
            ) && (
              <p className="muted small mt-3">
                새 단계는 목록 끝에 추가됩니다. 위로 버튼으로 최종 논문·심사결과
                이전의 적절한 순서로 옮겨 주세요.
              </p>
            )}
            <div className="action-row">
              <button
                type="button"
                className="button secondary"
                disabled={index === 0}
                aria-label={`${stage.name} 위로 이동`}
                onClick={() => moveStage(index, -1)}
              >
                <ArrowUp size={15} />
                위로
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={index === draft.stages.length - 1}
                aria-label={`${stage.name} 아래로 이동`}
                onClick={() => moveStage(index, 1)}
              >
                <ArrowDown size={15} />
                아래로
              </button>
            </div>
            <div className="grid gap-x-5 md:grid-cols-2">
              <label>
                단계명
                <input
                  value={stage.name}
                  onChange={(event) =>
                    patchStage(stage.id, { name: event.target.value })
                  }
                />
              </label>
              <label>
                마감일
                <input
                  type="date"
                  value={stage.deadline}
                  onChange={(event) =>
                    patchStage(stage.id, { deadline: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              설명
              <textarea
                value={stage.description}
                onChange={(event) =>
                  patchStage(stage.id, { description: event.target.value })
                }
              />
            </label>
            <div className="grid gap-x-5 md:grid-cols-2">
              <label>
                제출 서류 (쉼표로 구분)
                <input
                  value={stage.documents.join(", ")}
                  onChange={(event) =>
                    patchStage(stage.id, {
                      documents: event.target.value
                        .split(",")
                        .map((value) => value.trim()),
                    })
                  }
                />
              </label>
              <label>
                제출 방법
                <select
                  value={stage.submission}
                  onChange={(event) =>
                    patchStage(stage.id, {
                      submission: event.target.value as Stage["submission"],
                    })
                  }
                >
                  <option>시스템</option>
                  <option>이메일</option>
                  <option>수업</option>
                </select>
              </label>
              <label>
                서식 안내
                <input
                  value={stage.form}
                  onChange={(event) =>
                    patchStage(stage.id, { form: event.target.value })
                  }
                />
              </label>
              <label>
                증빙 방식
                <input
                  value={stage.evidence}
                  onChange={(event) =>
                    patchStage(stage.id, { evidence: event.target.value })
                  }
                />
              </label>
              <label>
                문의처
                <input
                  value={stage.contact}
                  onChange={(event) =>
                    patchStage(stage.id, { contact: event.target.value })
                  }
                  placeholder="가상 학과 문의처"
                />
              </label>
              {!department.stages.some(
                (savedStage) => savedStage.id === stage.id,
              ) && (
                <label>
                  새 단계 처리 방식
                  <select
                    value={stage.kind}
                    onChange={(event) =>
                      patchStage(stage.id, {
                        kind: event.target.value as Stage["kind"],
                      })
                    }
                  >
                    <option value="course">수업 확인</option>
                    <option value="submission">서류 제출</option>
                  </select>
                </label>
              )}
            </div>
            <label>
              유의사항
              <textarea
                value={stage.notice}
                onChange={(event) =>
                  patchStage(stage.id, { notice: event.target.value })
                }
              />
            </label>
          </details>
        ))}
      </div>
      <div className="action-row">
        <button type="button" className="button secondary" onClick={addStage}>
          <Plus size={16} />
          단계 추가
        </button>
        <button
          type="button"
          className="button primary"
          onClick={save}
          disabled={hasConflict}
        >
          <Save size={16} />
          학과 절차 저장
        </button>
        {dirty && (
          <span className="muted small self-center">
            저장하지 않은 변경 사항이 있습니다.
          </span>
        )}
      </div>
      <ErrorMessage message={error} />
      <StatusMessage message={message} />
    </div>
  );
}
