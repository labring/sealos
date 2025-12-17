import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalNotificationState {
  closedNotificationId: string | null;
  setClosedNotificationId: (id: string) => void;
}

export const useGlobalNotificationStore = create<GlobalNotificationState>()(
  persist(
    (set) => ({
      closedNotificationId: null,
      setClosedNotificationId: (id: string) => {
        set({ closedNotificationId: id });
      }
    }),
    {
      name: 'GlobalNotification'
    }
  )
);
