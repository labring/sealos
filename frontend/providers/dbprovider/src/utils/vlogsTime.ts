export function toVlogsQueryTime(value: string | number | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid log query timestamp');
  }

  return date.toISOString();
}
