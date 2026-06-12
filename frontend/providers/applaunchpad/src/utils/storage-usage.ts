import type { MonitorDataResult } from '@/types/monitor';

const getLatestNumericValue = (values?: Array<string | null>): number | null => {
  if (!values?.length) return null;

  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];
    if (value === null || value === undefined) continue;

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return null;
};

export const calculateStorageUsagePercent = (
  sizeData?: MonitorDataResult[] | null,
  availData?: MonitorDataResult[] | null
): number => {
  if (!sizeData?.length || !availData?.length) return 0;

  const availByName = new Map(
    availData
      .map((item) => [item.name, getLatestNumericValue(item.yData)] as const)
      .filter((item): item is readonly [string, number] => Boolean(item[0]) && item[1] !== null)
  );

  const totals = sizeData.reduce(
    (acc, item) => {
      if (!item.name) return acc;

      const size = getLatestNumericValue(item.yData);
      const avail = availByName.get(item.name);
      if (size === null || size <= 0 || avail === undefined) return acc;

      acc.size += size;
      acc.used += size - avail;
      return acc;
    },
    { size: 0, used: 0 }
  );

  if (totals.size <= 0 || totals.used <= 0) return 0;

  const percent = (totals.used / totals.size) * 100;
  if (percent > 0 && percent < 0.1) return 0.1;

  return Math.round(percent * 10) / 10;
};
