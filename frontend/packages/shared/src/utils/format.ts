/**
 * Format CPU usage values to millicores.
 */
export const cpuFormatToM = (cpu: string) => {
  if (!cpu || cpu === '0') {
    return 0;
  }
  let value = parseFloat(cpu);

  if (/n/gi.test(cpu)) {
    value = value / 1000 / 1000;
  } else if (/u/gi.test(cpu)) {
    value = value / 1000;
  } else if (/m/gi.test(cpu)) {
    // Already correctly formatted, no op here
  } else if (/k/gi.test(cpu)) {
    // k means 1000 cores, convert to millicores: 1k = 1000 * 1000m = 1000000m
    value = value * 1000 * 1000;
  } else {
    value = value * 1000;
  }
  if (value < 0.1) return 0;
  return Number(value.toFixed(4));
};

/**
 * Format memory usage values to mebibytes.
 */
export const memoryFormatToMi = (memory: string) => {
  if (!memory || memory === '0') {
    return 0;
  }

  let value = parseFloat(memory);

  if (/Ki/gi.test(memory)) {
    value = value / 1024;
  } else if (/Mi/gi.test(memory)) {
    // Already correctly formatted, no op here
  } else if (/Gi/gi.test(memory)) {
    value = value * 1024;
  } else if (/Ti/gi.test(memory)) {
    value = value * 1024 * 1024;
  } else {
    value = 0;
  }

  return Number(value.toFixed(2));
};

/**
 * Format storage usage values to mebibytes.
 */
export const storageFormatToMi = (storage: string) => {
  const value = String(storage).trim();
  if (!value || value === '0') return 0;

  if (/[KMGT]i/i.test(value)) return memoryFormatToMi(value);
  if (/^\d+\.?\d*$/.test(value)) return Number((parseFloat(value) / (1024 * 1024)).toFixed(2));
  return memoryFormatToMi(value);
};
