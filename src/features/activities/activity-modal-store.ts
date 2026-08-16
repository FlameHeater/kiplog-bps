import { create } from 'zustand';

interface ActivityModalState {
  isOpen: boolean;
  editingId: string | null;
  prefillDate: string | null;
  openNew: (prefillDate?: string) => void;
  openEdit: (activityId: string) => void;
  close: () => void;
}

// Transient UI state only (no domain data) — Zustand per PRD §11, so
// "+ Tambah Kegiatan" works identically from the FAB, Day Panel, or the
// Kegiatan list without route-specific wiring.
export const useActivityModalStore = create<ActivityModalState>((set) => ({
  isOpen: false,
  editingId: null,
  prefillDate: null,
  openNew: (prefillDate) => set({ isOpen: true, editingId: null, prefillDate: prefillDate ?? null }),
  openEdit: (activityId) => set({ isOpen: true, editingId: activityId, prefillDate: null }),
  close: () => set({ isOpen: false, editingId: null, prefillDate: null }),
}));
