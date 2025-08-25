import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

interface LogState {
  rawLogs: string;
  parsedLogs: {
    container: string;
    pod: string;
    logs_total: string;
    _msg: string;
    _time: string;
    stream: 'stderr' | 'stdout';
  }[];
  logCounts: { logs_total: string; _time: string }[];
  setLogs: (data: string) => void;
  exportLogs: () => void;
  setLogCounts: (data: string) => void;
}

export const useLogStore = create<LogState>()(
  devtools(
    immer((set, get) => ({
      rawLogs: '',
      parsedLogs: [],
      logCounts: [],
      setLogs: (data: string) =>
        set((state) => {
          if (!data) {
            state.rawLogs = '';
            state.parsedLogs = [];
            return;
          }
          state.rawLogs = data;
          const logLines = data.split('\n').filter((line) => line.trim());
          state.parsedLogs = logLines.map((line) => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return { raw: line, parseError: true };
            }
          });
        }),
      setLogCounts: (data: string) =>
        set((state) => {
          if (!data) {
            state.logCounts = [];
            return;
          }
          const logLines = data.split('\n').filter((line) => line.trim());

          state.logCounts = logLines.map((line) => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return { raw: line, parseError: true };
            }
          });
        }),
      exportLogs: () => {
        const { rawLogs } = get();
        const blob = new Blob([rawLogs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }))
  )
);
