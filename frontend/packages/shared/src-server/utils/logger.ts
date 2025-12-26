import dayjs from 'dayjs';

export function formatTime(date: Date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function infoLog(msg: string, obj: Record<string, unknown> = {}) {
  console.log(`[INFO] %s %s`, formatTime(new Date()), msg, JSON.stringify(obj));
}

export function errLog(msg: string, error: unknown) {
  console.log(`[ERROR] %s %s %s`, formatTime(new Date()), msg, JSON.stringify(error));
}

export function warnLog(msg: string, obj: Record<string, unknown> = {}) {
  console.log(`[WARN] %s %s %s`, formatTime(new Date()), msg, JSON.stringify(obj));
}

export type WstLogger = {
  infoLog: typeof infoLog;
  errLog: typeof errLog;
  warnLog: typeof warnLog;
};
