"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createSeed } from "../data/seed";
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
    (set) => ({
      data: createSeed(),
      studentId: "s1",
      professorId: "psychology-p1",
      hydrated: false,
      change: (fn) => set((state) => ({ data: fn(state.data) })),
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
      version: 1,
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
