import { create } from "zustand";

interface SearchState {
  open: boolean;
  query: string;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  open: false,
  query: "",
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
  setQuery: (query) => set({ query }),
  reset: () => set({ open: false, query: "" }),
}));
