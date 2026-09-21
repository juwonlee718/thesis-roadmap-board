"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createSeed, migrateBoard } from "../data/seed";
import type { BoardState } from "./types";
type BoardStore = {
  data: BoardState;
  studentId: string;
  professorId: string;
  hydrated: boolean;
  change: (fn: (state: BoardState) => BoardState) => void;
  selectStudent: (id: string) => void;
  selectProfessor: (id: string) => void;
  reset: () => void;
};
export const useBoard = create<BoardStore>()(
  persist(
    (set, get) => ({
      data: createSeed(),
      studentId: "s1",
      professorId: "psychology-p1",
      hydrated: false,
      change: (fn) => {
        const current = get();
        const data = fn(current.data);
        const serialized = JSON.stringify({
          state: {
            data,
            studentId: current.studentId,
            professorId: current.professorId,
          },
          version: 2,
        });
        if (serialized.length > 2_000_000)
          throw new Error(
            "브라우저 저장 공간이 부족합니다. 더 작은 파일을 선택해 주세요.",
          );
        try {
          localStorage.setItem("thesis-board-v1", serialized);
        } catch {
          throw new Error(
            "저장 공간이 부족하거나 브라우저 저장이 차단되었습니다. 변경을 저장하지 못했습니다.",
          );
        }
        set({ data });
      },
      selectStudent: (studentId) => set({ studentId }),
      selectProfessor: (professorId) => set({ professorId }),
      reset: () =>
        set({
          data: createSeed(),
          studentId: "s1",
          professorId: "psychology-p1",
        }),
    }),
    {
      name: "thesis-board-v1",
      version: 2,
      migrate: (persisted) => {
        const old = persisted as {
          data?: BoardState;
          studentId?: string;
          professorId?: string;
        };
        return {
          data: migrateBoard(old.data ?? {}),
          studentId: old.studentId ?? "s1",
          professorId: old.professorId ?? "psychology-p1",
        };
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        data: state.data,
        studentId: state.studentId,
        professorId: state.professorId,
      }),
    },
  ),
);
