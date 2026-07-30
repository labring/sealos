const NIP_IO_SUFFIXES = ['nip.io', 'sslip.io'];

const isValidIPv4Part = (part: string) => {
  if (!/^\d{1,3}$/.test(part)) return false;
  const value = Number(part);
  return value >= 0 && value <= 255;
};

export const extractIPv4FromNipDomain = (domain?: string) => {
  const normalizedDomain = (domain || '').trim().toLowerCase().replace(/\.+$/g, '');
  if (!normalizedDomain) return '';

  const suffix = NIP_IO_SUFFIXES.find((item) => normalizedDomain.endsWith(`.${item}`));
  if (!suffix) return '';

  const beforeSuffix = normalizedDomain.slice(0, -suffix.length - 1);
  const labels = beforeSuffix.split('.');

  for (let index = 0; index <= labels.length - 4; index++) {
    const parts = labels.slice(index, index + 4);
    if (parts.every(isValidIPv4Part)) {
      return parts.join('.');
    }
  }

  return '';
};

export const resolveNodePortHost = ({ configuredHost }: { configuredHost?: string }) => {
  return (configuredHost || '').trim().replace(/\.+$/g, '');
};
