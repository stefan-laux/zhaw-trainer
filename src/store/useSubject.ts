import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubjectId } from "../data/types";
import { DEFAULT_SUBJECT } from "../data/registry";

interface SubjectState {
  active: SubjectId;
  setActive: (id: SubjectId) => void;
}

export const useSubject = create<SubjectState>()(
  persist(
    (set) => ({
      active: DEFAULT_SUBJECT,
      setActive: (id) => set({ active: id }),
    }),
    { name: "zhaw-trainer-subject", version: 1 }
  )
);
