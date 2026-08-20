export type DotenvEnv = {
  key: string;
  value: string;
};

// Mirrors dotenv's supported assignment forms while keeping the historical
// "- KEY=value" and "KEY:value" input accepted by the edit dialog.
const ENV_ENTRY_REGEXP =
  /^\s*(?:-\s*)?(?:export\s+)?([\w.-]+|['"][^'"\r\n]+['"])(?:\s*=\s*?|:\s*?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]*?)\s*(?:#.*)?$/gm;

const stripKeyQuotes = (key: string) => key.replace(/^['"]|['"]$/g, '').trim();

const parseDotenvValue = (rawValue = '') => {
  const value = rawValue.trim();
  const quote = value[0];

  if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote)) {
    const unquoted = value.slice(1, -1);

    if (quote === '"') {
      return unquoted.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }

    return unquoted;
  }

  return value;
};

const quoteDotenvValue = (value: string) => {
  if (value === '') {
    return '';
  }

  if (!/[\r\n#]|^\s|\s$|^['"`]/.test(value)) {
    return value;
  }

  if (!value.includes("'")) {
    return `'${value}'`;
  }

  if (!value.includes('`')) {
    return `\`${value}\``;
  }

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

export const parseDotenvEnvs = (input: string): DotenvEnv[] => {
  const result: DotenvEnv[] = [];
  const lines = input.replace(/\r\n?/g, '\n');
  let match: RegExpExecArray | null;

  ENV_ENTRY_REGEXP.lastIndex = 0;
  while ((match = ENV_ENTRY_REGEXP.exec(lines)) !== null) {
    const key = stripKeyQuotes(match[1] ?? '');

    if (!key) {
      continue;
    }

    result.push({
      key,
      value: parseDotenvValue(match[2])
    });
  }

  return result;
};

export const stringifyDotenvEnvs = (envs: DotenvEnv[]) =>
  envs.map(({ key, value }) => `${key}=${quoteDotenvValue(value)}`).join('\n');
