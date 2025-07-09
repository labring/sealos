import { subMinutes } from 'date-fns';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type DateTimeState = {
  startDateTime: Date;
  endDateTime: Date;
  timeZone: 'local' | 'utc';
  refreshInterval: number;
  setStartDateTime: (time: Date) => void;
  setEndDateTime: (time: Date) => void;
  setTimeZone: (timeZone: 'local' | 'utc') => void;
  setRefreshInterval: (val: number) => void;
};

export const useDateTimeStore = create<DateTimeState>()(
  immer((set, get) => ({
    startDateTime: subMinutes(new Date(), 30),
    endDateTime: new Date(),
    timeZone: 'local',
    refreshInterval: 0,
    setStartDateTime: (datetime) => set({ startDateTime: datetime }),
    setEndDateTime: (datetime) => set({ endDateTime: datetime }),
    setTimeZone: (timeZone) => set({ timeZone }),
    setRefreshInterval: (val) => set({ refreshInterval: val })
  }))
);
