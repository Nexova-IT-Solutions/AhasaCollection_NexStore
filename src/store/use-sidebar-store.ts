import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isOpen: true,
  toggleSidebar: () =>
    set((state) => {
      const next = !state.isOpen;
      console.log("[SidebarStore] toggleSidebar:", next);
      return { isOpen: next };
    }),
  setSidebar: (open: boolean) => {
    console.log("[SidebarStore] setSidebar:", open);
    set({ isOpen: open });
  },
}));
