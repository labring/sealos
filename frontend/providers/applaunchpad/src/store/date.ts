import { subDays, subMinutes } from 'date-fns';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type DateTimeState = {
  startDateTime: Date;
  endDateTime: Date;
  refreshInterval: number;
  isManualRange: boolean;
  autoRange: string | null;
  setStartDateTime: (time: Date) => void;
  setEndDateTime: (time: Date) => void;
  setRefreshInterval: (val: number) => void;
  setManualRange: () => void;
  setAutoRange: (range: string | null) => void;
};

const useDateTimeStore = create<DateTimeState>()(
  immer((set, get) => ({
    startDateTime: subMinutes(new Date(), 30),
    endDateTime: new Date(),
    refreshInterval: 0,
    isManualRange: false,
    autoRange: '30m',
    setStartDateTime: (datetime) => set({ startDateTime: datetime }),
    setEndDateTime: (datetime) => set({ endDateTime: datetime }),
    setRefreshInterval: (val) => set({ refreshInterval: val }),
    setManualRange: () => set({ isManualRange: true }),
    setAutoRange: (range) => set({ autoRange: range, isManualRange: false })
  }))
);

export default useDateTimeStore;
