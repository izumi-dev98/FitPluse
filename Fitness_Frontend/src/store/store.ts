import { create } from 'zustand';

interface AppState {
  profileId: string | null;
  setProfileId: (id: string) => void;
  modalOpen: boolean;
  modalTitle: string;
  modalBody: string;
  openModal: (title: string, body: string) => void;
  closeModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  profileId: null,
  setProfileId: (id) => set({ profileId: id }),
  modalOpen: false,
  modalTitle: '',
  modalBody: '',
  openModal: (title, body) => set({ modalOpen: true, modalTitle: title, modalBody: body }),
  closeModal: () => set({ modalOpen: false, modalTitle: '', modalBody: '' }),
}));
