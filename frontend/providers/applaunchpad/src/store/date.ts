import { subDays } from 'date-fns';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type DateTimeState = {
  startDateTime: Date;
  endDateTime: Date;
  timeZone: 'local' | 'utc';
  setStartDateTime: (time: Date) => void;
  setEndDateTime: (time: Date) => void;
  setTimeZone: (timeZone: 'local' | 'utc') => void;
};

const useDateTimeStore = create<DateTimeState>()(
  devtools(
    immer((set, get) => ({
      startDateTime: subDays(new Date(), 7),
      endDateTime: new Date(),
      timeZone: 'local',
      setStartDateTime: (datetime) => set({ startDateTime: datetime }),
      setEndDateTime: (datetime) => set({ endDateTime: datetime }),
      setTimeZone: (timeZone) => set({ timeZone })
    }))
  )
);

export default useDateTimeStore;
