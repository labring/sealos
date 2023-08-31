import dayjs from 'dayjs';

export function formatTime(date: Date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function infoLog(msg: string, obj: Record<string, any> = {}) {
  console.log(`[INFO] %s %s`, formatTime(new Date()), msg, JSON.stringify(obj));
}

export function errLog(msg: string, error: any) {
  console.log(`[ERROR] %s %s %s`, formatTime(new Date()), msg, JSON.stringify(error));
}

export function warnLog(msg: string, obj: Record<string, any> = {}) {
  console.log(`[WARN] %s %s %s`, formatTime(new Date()), msg, JSON.stringify(obj));
}
