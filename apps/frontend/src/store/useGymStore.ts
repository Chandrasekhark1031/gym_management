import { create } from 'zustand';

interface GymState {
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useGymStore = create<GymState>((set) => ({
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
