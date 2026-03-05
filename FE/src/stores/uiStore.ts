import { create } from 'zustand';

interface UiState {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  modalOpen: false,
  setModalOpen: (open) => set({ modalOpen: open }),
}));
