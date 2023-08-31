import dayjs from 'dayjs';

export function formatTime(date: Date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function infoLog(msg: string, obj: Record<string, any> = {}) {
  console.log(`[INFO] ${formatTime(new Date())} ${msg}`, obj);
}

export function errLog(msg: string, error: any) {
  console.log(`[ERROR] ${formatTime(new Date())} ${msg}`, error);
}

export function warnLog(msg: string, obj: Record<string, any> = {}) {
  console.log(`[WARN] ${formatTime(new Date())} ${msg}`, obj);
}
