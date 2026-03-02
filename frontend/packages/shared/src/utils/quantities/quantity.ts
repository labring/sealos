import { QuantityParseError } from './errors';
import { Scale as ScaleConst, type Format, type Scale } from './types';

/**
 * Options for formatting a quantity string for display purposes.
 *
 * This is separate from `toString()` which strictly follows Kubernetes canonicalization.
 * Use `formatForDisplay()` for user-facing output where readability and precision control are needed.
 */
export type QuantityDisplayOptions = {
  /**
   * Suffix category to use when formatting.
   *
   * - When omitted, uses the remembered `Quantity.format` from parsing.
   * - For BinarySI, scale values are interpreted as base-1024 exponents (Ki=10, Mi=20, Gi=30, etc.).
   * - For DecimalSI/DecimalExponent, scale values are base-10 exponents.
   */
  format?: Format;
  /**
   * Output scaling strategy.
   *
   * - `"auto"`: automatically select the most readable scale (e.g., 256.1Mi or 1.1Gi).
   * - `"canonical"`: use Kubernetes canonicalization (same as `toString()`).
   * - `"preserve"`: preserve parsed suffix category (best-effort, numeric part still canonicalized).
   * - `Scale`: force a specific scale. For BinarySI, this maps to base-1024 exponents.
   */
  scale?: Scale | 'auto' | 'canonical' | 'preserve';
  /**
   * When forcing a specific `scale`, whether to round to an integer mantissa
   * using Kubernetes semantics (ceil away from 0). Defaults to `false`.
   */
  round?: boolean;
  /**
   * Maximum fractional digits to keep when `round=false`.
   *
   * - Defaults to `2` for better readability in tables/UI.
   * - Set to `Infinity` to keep full precision.
   * - Trailing zeros are automatically trimmed unless `round=true`.
   */
  digits?: number;
};

const MAX_INT64: bigint = (1n << 63n) - 1n;

const absBigInt = (v: bigint): bigint => (v < 0n ? -v : v);

const pow2BigInt = (exp: number): bigint => {
  if (!Number.isInteger(exp) || exp < 0) {
    throw new RangeError(`pow2 exponent must be a non-negative integer, got: ${exp}`);
  }
  return 1n << BigInt(exp);
};

const pow10BigInt = (exp: number): bigint => {
  if (!Number.isInteger(exp) || exp < 0) {
    throw new RangeError(`pow10 exponent must be a non-negative integer, got: ${exp}`);
  }

  // Avoid bitwise ops: JS bitwise converts to 32-bit signed integers.
  let result = 1n;
  let base = 10n;
  let e = exp;

  while (e > 0) {
    if (e % 2 === 1) result *= base;
    base *= base;
    e = Math.floor(e / 2);
  }
  return result;
};

const divRoundAwayFromZero = (n: bigint, d: bigint): { q: bigint; exact: boolean } => {
  if (d <= 0n) throw new RangeError('divisor must be positive');
  if (n === 0n) return { q: 0n, exact: true };
  const a = absBigInt(n);
  const q = a / d;
  const r = a % d;
  const rounded = r === 0n ? q : q + 1n;
  return { q: n < 0n ? -rounded : rounded, exact: r === 0n };
};

const isWhitespacePresent = (s: string): boolean => s.trim() !== s;

const normalizeDecimal = (value: bigint, scale: number): { value: bigint; scale: number } => {
  if (value === 0n) return { value: 0n, scale: 0 };
  let v = value;
  let s = scale;
  while (v % 10n === 0n) {
    v /= 10n;
    s += 1;
  }
  return { value: v, scale: s };
};

const roundToMinScale = (
  value: bigint,
  scale: number,
  minScale: number
): { value: bigint; scale: number; exact: boolean } => {
  if (value === 0n) return { value: 0n, scale: 0, exact: true };
  if (scale >= minScale) return { value, scale, exact: true };
  const diff = minScale - scale;
  const d = pow10BigInt(diff);
  const { q, exact } = divRoundAwayFromZero(value, d);
  return { value: q, scale: minScale, exact };
};

const exceedsMaxAllowed = (absUnscaled: bigint, scale: number): boolean => {
  if (absUnscaled === 0n) return false;
  if (scale >= 0) {
    return absUnscaled * pow10BigInt(scale) > MAX_INT64;
  }
  const d = pow10BigInt(-scale);
  return absUnscaled > MAX_INT64 * d;
};

const capToMaxAllowed = (
  value: bigint,
  scale: number
): { value: bigint; scale: number; capped: boolean } => {
  if (value === 0n) return { value: 0n, scale: 0, capped: false };
  const abs = absBigInt(value);
  if (!exceedsMaxAllowed(abs, scale)) return { value, scale, capped: false };
  return { value: value < 0n ? -MAX_INT64 : MAX_INT64, scale: 0, capped: true };
};

const compareAmounts = (
  aValue: bigint,
  aScale: number,
  bValue: bigint,
  bScale: number
): -1 | 0 | 1 => {
  if (aScale === bScale) {
    if (aValue === bValue) return 0;
    return aValue < bValue ? -1 : 1;
  }
  if (aScale > bScale) {
    const av = aValue * pow10BigInt(aScale - bScale);
    if (av === bValue) return 0;
    return av < bValue ? -1 : 1;
  }
  const bv = bValue * pow10BigInt(bScale - aScale);
  if (aValue === bv) return 0;
  return aValue < bv ? -1 : 1;
};

const isNonZeroAbsLessThanOne = (value: bigint, scale: number): boolean => {
  if (value === 0n) return false;
  if (scale >= 0) return false;
  const abs = absBigInt(value);
  return abs < pow10BigInt(-scale);
};

type InterpretResult = { base: 10 | 2; exponent: number; format: Format };

const interpretSuffix = (suffix: string): InterpretResult => {
  // Fast lookup (matches k8s fastLookup)
  switch (suffix) {
    case '':
      return { base: 10, exponent: 0, format: 'DecimalSI' };
    case 'n':
      return { base: 10, exponent: -9, format: 'DecimalSI' };
    case 'u':
      return { base: 10, exponent: -6, format: 'DecimalSI' };
    case 'm':
      return { base: 10, exponent: -3, format: 'DecimalSI' };
    case 'k':
      return { base: 10, exponent: 3, format: 'DecimalSI' };
    case 'M':
      return { base: 10, exponent: 6, format: 'DecimalSI' };
    case 'G':
      return { base: 10, exponent: 9, format: 'DecimalSI' };
  }

  switch (suffix) {
    case 'T':
      return { base: 10, exponent: 12, format: 'DecimalSI' };
    case 'P':
      return { base: 10, exponent: 15, format: 'DecimalSI' };
    case 'E':
      return { base: 10, exponent: 18, format: 'DecimalSI' };

    case 'Ki':
      return { base: 2, exponent: 10, format: 'BinarySI' };
    case 'Mi':
      return { base: 2, exponent: 20, format: 'BinarySI' };
    case 'Gi':
      return { base: 2, exponent: 30, format: 'BinarySI' };
    case 'Ti':
      return { base: 2, exponent: 40, format: 'BinarySI' };
    case 'Pi':
      return { base: 2, exponent: 50, format: 'BinarySI' };
    case 'Ei':
      return { base: 2, exponent: 60, format: 'BinarySI' };
  }

  if (suffix.length > 1 && (suffix[0] === 'e' || suffix[0] === 'E')) {
    const exp = Number(suffix.slice(1));
    if (!Number.isInteger(exp)) {
      throw new QuantityParseError('SUFFIX', suffix, 'Invalid decimal exponent suffix');
    }
    return { base: 10, exponent: exp, format: 'DecimalExponent' };
  }

  throw new QuantityParseError('SUFFIX', suffix, 'Unknown quantity suffix');
};

const constructSuffix = (base: 10 | 2, exponent: number, format: Format): string => {
  if (format === 'DecimalSI') {
    if (base === 10) {
      switch (exponent) {
        case -9:
          return 'n';
        case -6:
          return 'u';
        case -3:
          return 'm';
        case 0:
          return '';
        case 3:
          return 'k';
        case 6:
          return 'M';
        case 9:
          return 'G';
        case 12:
          return 'T';
        case 15:
          return 'P';
        case 18:
          return 'E';
        default:
          return '';
      }
    }
    // base 2 exponent 0 is allowed and emits empty suffix
    if (base === 2 && exponent === 0) return '';
    return '';
  }

  if (format === 'BinarySI') {
    if (base !== 2) return '';
    switch (exponent) {
      case 10:
        return 'Ki';
      case 20:
        return 'Mi';
      case 30:
        return 'Gi';
      case 40:
        return 'Ti';
      case 50:
        return 'Pi';
      case 60:
        return 'Ei';
      default:
        return '';
    }
  }

  // DecimalExponent
  if (base !== 10) return '';
  if (exponent === 0) return '';
  return `e${exponent}`;
};

const stringCache = new WeakMap<Quantity, string>();

type CanonicalNumber = { mantissa: string; exponent: number };

class Amount {
  readonly value: bigint;
  readonly scale: number;

  constructor(value: bigint, scale: number) {
    this.value = value;
    this.scale = scale;
  }

  asCanonicalDecimal(): CanonicalNumber {
    if (this.value === 0n) return { mantissa: '0', exponent: 0 };
    let mantissa = this.value;
    let exponent = this.scale;

    while (mantissa % 10n === 0n) {
      mantissa /= 10n;
      exponent += 1;
    }

    while (exponent % 3 !== 0) {
      mantissa *= 10n;
      exponent -= 1;
    }
    return { mantissa: mantissa.toString(10), exponent };
  }

  asCanonicalBase1024(): CanonicalNumber {
    if (this.value === 0n) return { mantissa: '0', exponent: 0 };
    // Round up to integer first (scale 0), away from zero.
    const { q } = scaledInt(this.value, this.scale, 0);
    let v = q;
    let exponent = 0;
    const negative = v < 0n;
    if (negative) v = -v;

    while (v !== 0n && v % 1024n === 0n) {
      v /= 1024n;
      exponent += 1;
    }
    if (negative) v = -v;
    return { mantissa: v.toString(10), exponent };
  }
}

const scaledInt = (
  value: bigint,
  valueScale: number,
  targetScale: number
): { q: bigint; exact: boolean } => {
  if (value === 0n) return { q: 0n, exact: true };
  const diff = valueScale - targetScale;
  if (diff === 0) return { q: value, exact: true };
  if (diff > 0) return { q: value * pow10BigInt(diff), exact: true };
  const d = pow10BigInt(-diff);
  return divRoundAwayFromZero(value, d);
};

type ParsedParts = {
  positive: boolean;
  value: string;
  num: string;
  denom: string;
  suffix: string;
};

const parseQuantityString = (input: string): ParsedParts => {
  // This is a port of k8s parseQuantityString() scanner.
  let positive = true;
  let pos = 0;
  const end = input.length;

  if (pos < end) {
    switch (input[0]) {
      case '-':
        positive = false;
        pos += 1;
        break;
      case '+':
        pos += 1;
        break;
    }
  }

  // Strip leading zeros.
  for (;;) {
    if (pos >= end) {
      return { positive, value: '0', num: '0', denom: '', suffix: '' };
    }
    if (input[pos] === '0') {
      pos += 1;
      continue;
    }
    break;
  }

  // Extract numerator.
  const numStart = pos;
  for (;;) {
    if (pos >= end) {
      const num = input.slice(numStart, end) || '0';
      return { positive, value: input.slice(0, end), num, denom: '', suffix: '' };
    }
    const ch = input[pos]!;
    if (ch >= '0' && ch <= '9') {
      pos += 1;
      continue;
    }
    break;
  }
  let num = input.slice(numStart, pos);
  if (num.length === 0) num = '0';

  // Denominator.
  let denom = '';
  if (pos < end && input[pos] === '.') {
    pos += 1;
    const denomStart = pos;
    for (;;) {
      if (pos >= end) {
        denom = input.slice(denomStart, end);
        return { positive, value: input.slice(0, end), num, denom, suffix: '' };
      }
      const ch = input[pos]!;
      if (ch >= '0' && ch <= '9') {
        pos += 1;
        continue;
      }
      break;
    }
    denom = input.slice(denomStart, pos);
  }

  const value = input.slice(0, pos);

  // Suffix.
  const suffixStart = pos;
  for (;;) {
    if (pos >= end) {
      return { positive, value, num, denom, suffix: input.slice(suffixStart, end) };
    }
    const c = input[pos]!;
    if ('eEinumkKMGTP'.includes(c)) {
      pos += 1;
      continue;
    }
    break;
  }

  if (pos < end) {
    if (input[pos] === '-' || input[pos] === '+') {
      pos += 1;
    }
  }

  for (;;) {
    if (pos >= end) {
      return { positive, value, num, denom, suffix: input.slice(suffixStart, end) };
    }
    const ch = input[pos]!;
    if (ch >= '0' && ch <= '9') {
      pos += 1;
      continue;
    }
    // Encountered a non-decimal in the exponent part => invalid.
    throw new QuantityParseError('FORMAT_WRONG', input, 'Invalid quantity format');
  }
};

const parseFromParts = (parts: ParsedParts): { value: bigint; scale: number; format: Format } => {
  const { positive, num, denom, suffix } = parts;

  const { base, exponent, format } = interpretSuffix(suffix);

  // Numeric value = (num * 10^len(denom) + denom) * 10^-len(denom)
  const shifted = `${num}${denom}`;
  let unscaled: bigint;
  try {
    unscaled = BigInt(shifted.length === 0 ? '0' : shifted);
  } catch (cause) {
    throw new QuantityParseError('NUMERIC', shifted, 'Invalid numeric part', cause);
  }
  if (!positive) unscaled = -unscaled;

  let scale = -denom.length;

  if (base === 10) {
    scale += exponent;
  } else {
    // base == 2
    if (exponent < 0) {
      throw new QuantityParseError('SUFFIX', suffix, 'BinarySI exponent must be non-negative');
    }
    unscaled *= 1n << BigInt(exponent);
  }

  // Round up to the minimum representable scale (Nano) for non-zero values.
  const rounded = roundToMinScale(unscaled, scale, -9);
  unscaled = rounded.value;
  scale = rounded.scale;

  // Cap to the max allowed magnitude.
  const capped = capToMaxAllowed(unscaled, scale);
  unscaled = capped.value;
  scale = capped.scale;

  // BinarySI special case: emit DecimalSI for values in (-1, 1) excluding 0.
  let outFormat = format;
  if (outFormat === 'BinarySI' && isNonZeroAbsLessThanOne(unscaled, scale)) {
    outFormat = 'DecimalSI';
  }

  const normalized = normalizeDecimal(unscaled, scale);
  return { value: normalized.value, scale: normalized.scale, format: outFormat };
};

const DECIMAL_SI_EXPONENTS: readonly number[] = [-9, -6, -3, 0, 3, 6, 9, 12, 15, 18] as const;
const BINARY_SI_BITS: readonly number[] = [0, 10, 20, 30, 40, 50, 60] as const;

const clampToDecimalSIExponent = (exp: number): number => {
  // Snap to multiples of 3 and clamp into [-9, 18]
  let e = Math.trunc(exp / 3) * 3;
  if (e > 18) e = 18;
  if (e < -9) e = -9;
  return e;
};

const clampToBinarySIBits = (bits: number): number => {
  // Snap to multiples of 10 and clamp into [0, 60]
  let b = Math.trunc(bits / 10) * 10;
  if (b > 60) b = 60;
  if (b < 0) b = 0;
  return b;
};

const chooseAutoDecimalExponent = (absValue: bigint, scale: number): number => {
  // Pick the largest exp (multiple of 3) such that abs(q) >= 10^exp
  // so mantissa will be in [1, 1000) (before rounding).
  for (let i = DECIMAL_SI_EXPONENTS.length - 1; i >= 0; i--) {
    const exp = DECIMAL_SI_EXPONENTS[i]!;
    if (compareAmounts(absValue, scale, 1n, exp) >= 0) return exp;
  }
  return -9;
};

const chooseAutoBinaryBits = (absValue: bigint, scale: number): number => {
  // Pick the largest bits (multiple of 10) such that abs(q) >= 2^bits
  // so mantissa will be in [1, 1024) (before rounding).
  for (let i = BINARY_SI_BITS.length - 1; i >= 0; i--) {
    const bits = BINARY_SI_BITS[i]!;
    if (compareAmounts(absValue, scale, pow2BigInt(bits), 0) >= 0) return bits;
  }
  return 0;
};

const buildMantissaRationalForDecimal = (
  value: bigint,
  valueScale: number,
  targetExp: number
): { numer: bigint; denom: bigint } => {
  // mantissa = (value * 10^valueScale) / 10^targetExp
  if (value === 0n) return { numer: 0n, denom: 1n };
  if (valueScale >= targetExp) {
    return { numer: value * pow10BigInt(valueScale - targetExp), denom: 1n };
  }
  return { numer: value, denom: pow10BigInt(targetExp - valueScale) };
};

const buildMantissaRationalForBinary = (
  value: bigint,
  valueScale: number,
  targetBits: number
): { numer: bigint; denom: bigint } => {
  // mantissa = (value * 10^valueScale) / 2^targetBits
  if (value === 0n) return { numer: 0n, denom: 1n };
  const two = pow2BigInt(targetBits);
  if (valueScale >= 0) {
    return { numer: value * pow10BigInt(valueScale), denom: two };
  }
  // valueScale < 0 => value / 10^-valueScale
  return { numer: value, denom: two * pow10BigInt(-valueScale) };
};

const roundedAbsScaled = (numer: bigint, denom: bigint, digits: number): bigint => {
  // returns |numer/denom| rounded to `digits` decimal places, as an integer scaled by 10^digits
  const a = absBigInt(numer);
  if (a === 0n) return 0n;
  const scale = pow10BigInt(digits);
  const scaled = a * scale;
  let q = scaled / denom;
  const r = scaled % denom;
  if (r * 2n >= denom) q += 1n; // round half-up (ties away from 0 in magnitude)
  return q;
};

const formatRationalDecimal = (numer: bigint, denom: bigint, digits: number): string => {
  if (denom <= 0n) throw new RangeError('denominator must be positive');
  if (numer === 0n) return '0';

  const neg = numer < 0n;
  const a = absBigInt(numer);

  // Exact expansion (terminating) – denom in our usage is always 2^x * 5^y
  if (digits === Infinity) {
    const intPart = a / denom;
    let rem = a % denom;
    if (rem === 0n) return (neg ? '-' : '') + intPart.toString(10);

    let frac = '';
    // Safety cap (should be plenty for 2^60 * 10^9 => <= 69 digits)
    for (let i = 0; i < 256 && rem !== 0n; i++) {
      rem *= 10n;
      const d = rem / denom;
      rem = rem % denom;
      frac += d.toString(10); // single digit 0..9
    }
    frac = frac.replace(/0+$/g, '');
    const out = frac.length === 0 ? intPart.toString(10) : `${intPart.toString(10)}.${frac}`;
    return neg ? `-${out}` : out;
  }

  if (!Number.isInteger(digits) || digits < 0) {
    throw new RangeError(`digits must be a non-negative integer or Infinity, got: ${digits}`);
  }
  if (digits > 256) {
    throw new RangeError(`digits too large for display: ${digits} (max 256)`);
  }

  let intPart = a / denom;
  const rem = a % denom;

  if (digits === 0) {
    if (rem === 0n) return (neg ? '-' : '') + intPart.toString(10);
    if (rem * 2n >= denom) intPart += 1n;
    return (neg ? '-' : '') + intPart.toString(10);
  }

  const scale = pow10BigInt(digits);
  let frac = (rem * scale) / denom;
  const r2 = (rem * scale) % denom;
  if (r2 * 2n >= denom) frac += 1n;

  if (frac === scale) {
    // carry
    frac = 0n;
    intPart += 1n;
  }

  let fracStr = frac.toString(10);
  while (fracStr.length < digits) fracStr = `0${fracStr}`;
  fracStr = fracStr.replace(/0+$/g, '');

  const out = fracStr.length === 0 ? intPart.toString(10) : `${intPart.toString(10)}.${fracStr}`;
  return neg ? `-${out}` : out;
};

export class Quantity {
  /**
   * The remembered suffix category from parsing (or explicitly set via `withFormat()`).
   *
   * Kubernetes prefers to re-emit the same format category after canonicalization.
   */
  public readonly format: Format;

  readonly #value: bigint;
  readonly #scale: number;

  static readonly ZERO: Quantity = (() => {
    const q = new Quantity(0n, 0, 'DecimalSI');
    stringCache.set(q, '0');
    return q;
  })();

  /**
   * Parse a quantity string with Kubernetes-aligned semantics.
   *
   * Notes:
   * - Does NOT trim whitespace (leading/trailing whitespace is invalid).
   * - Remembers the suffix category (format) for future serialization.
   */
  static parse(input: string): Quantity {
    if (input.length === 0) {
      throw new QuantityParseError('FORMAT_WRONG', input, 'Empty quantity');
    }
    if (isWhitespacePresent(input)) {
      throw new QuantityParseError(
        'FORMAT_WRONG',
        input,
        'Quantity must not include leading/trailing whitespace'
      );
    }
    if (input === '0') return Quantity.ZERO;

    let parts: ParsedParts;
    try {
      parts = parseQuantityString(input);
    } catch (e) {
      if (e instanceof QuantityParseError)
        throw new QuantityParseError(e.code, input, e.message, e);
      throw new QuantityParseError('FORMAT_WRONG', input, 'Invalid quantity format', e);
    }

    let parsed: { value: bigint; scale: number; format: Format };
    try {
      parsed = parseFromParts(parts);
    } catch (e) {
      if (e instanceof QuantityParseError) {
        // Keep the original input on the error for easier debugging.
        throw new QuantityParseError(e.code, input, e.message, e);
      }
      throw new QuantityParseError('NUMERIC', input, 'Invalid quantity', e);
    }

    return new Quantity(parsed.value, parsed.scale, parsed.format);
  }

  /**
   * Same as `parse()`, but intended for scenarios where the input must be valid
   * (e.g. tests). Throws on error.
   */
  static mustParse(input: string): Quantity {
    return Quantity.parse(input);
  }

  /**
   * Kubernetes-aligned JSON decoding:
   * - Accepts `string` (will `trim()` then parse).
   * - Accepts JSON `number` (will stringify then parse).
   *
   * Prefer using strings in business code because JS numbers may already lose precision.
   */
  static fromJSON(v: unknown): Quantity {
    if (typeof v === 'string') {
      return Quantity.parse(v.trim());
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) {
        throw new TypeError('Quantity JSON number must be finite');
      }
      return Quantity.parse(String(v));
    }
    throw new TypeError('Quantity JSON value must be a string or number');
  }

  /**
   * Create a quantity from an int64-like integer value at scale 0.
   *
   * The value will be capped to the Kubernetes max magnitude if needed.
   */
  static newQuantity(value: bigint, format: Format): Quantity {
    const normalized = normalizeDecimal(value, 0);
    const capped = capToMaxAllowed(normalized.value, normalized.scale);
    return new Quantity(capped.value, capped.scale, format);
  }

  /**
   * Create a quantity from a milli-scaled integer value (value * 10^-3).
   *
   * The value will be rounded up to the minimum representable scale (nano) and
   * capped to the Kubernetes max magnitude if needed.
   */
  static newMilliQuantity(milliValue: bigint, format: Format): Quantity {
    const rounded = roundToMinScale(milliValue, -3, -9);
    const capped = capToMaxAllowed(rounded.value, rounded.scale);
    const normalized = normalizeDecimal(capped.value, capped.scale);
    return new Quantity(normalized.value, normalized.scale, format);
  }

  /**
   * Create a DecimalSI quantity representing `value * 10^scale`.
   *
   * The value will be rounded up to the minimum representable scale (nano) and
   * capped to the Kubernetes max magnitude if needed.
   */
  static newScaledQuantity(value: bigint, scale: Scale): Quantity {
    const rounded = roundToMinScale(value, Number(scale), -9);
    const capped = capToMaxAllowed(rounded.value, rounded.scale);
    const normalized = normalizeDecimal(capped.value, capped.scale);
    return new Quantity(normalized.value, normalized.scale, 'DecimalSI');
  }

  private constructor(value: bigint, scale: number, format: Format) {
    this.#value = value;
    this.#scale = scale;
    this.format = format;
    Object.freeze(this);
  }

  /**
   * Return the canonical Kubernetes quantity string.
   *
   * This method strictly follows Kubernetes canonicalization rules:
   * - No precision loss
   * - No fractional digits
   * - Uses the largest possible exponent/suffix
   *
   * This is the string used for JSON serialization as well.
   * For display formatting with precision control, use `formatForDisplay()` instead.
   */
  toString(): string {
    const cached = stringCache.get(this);
    if (cached !== undefined) return cached;
    const s = this.#canonicalizeString();
    stringCache.set(this, s);
    return s;
  }

  /**
   * Format a quantity string for display purposes with optional precision control.
   *
   * Defaults when options are omitted:
   * - `scale`: `'auto'` (choose the most readable unit)
   * - `format`: this quantity's remembered format from parsing
   * - `round`: `false`
   * - `digits`: `2`
   *
   * @param options - Display formatting options; all have defaults and can be omitted
   * @returns Formatted string suitable for UI display
   */
  formatForDisplay(options?: QuantityDisplayOptions): string {
    const opts = options ?? {};
    const scaleOpt = opts.scale ?? 'auto';

    // Canonical display: exactly k8s string form (optionally with format override)
    if (scaleOpt === 'canonical') {
      const q = opts.format ? this.withFormat(opts.format) : this;
      return q.toString();
    }

    if (this.#value === 0n) return '0';

    const format: Format = opts.format ?? this.format;
    const roundInt = opts.round === true;

    const digits: number = roundInt ? 0 : opts.digits ?? 2;

    if (digits !== Infinity && (!Number.isInteger(digits) || digits < 0)) {
      throw new RangeError(`digits must be a non-negative integer or Infinity, got: ${digits}`);
    }
    if (digits !== Infinity && digits > 256) {
      throw new RangeError(`digits too large for display: ${digits} (max 256)`);
    }

    const absValue = absBigInt(this.#value);

    // ===== BinarySI display =====
    if (format === 'BinarySI') {
      let bits: number;
      if (typeof scaleOpt === 'string') {
        // 'auto' | 'preserve'
        bits = chooseAutoBinaryBits(absValue, this.#scale);
      } else {
        bits = Number(scaleOpt);
      }
      bits = clampToBinarySIBits(bits);

      // For auto-ish display, if rounding would produce 1024.00Ki, bump to next unit (Mi), etc.
      if (!roundInt && digits !== Infinity && (scaleOpt === 'auto' || scaleOpt === 'preserve')) {
        const cur = buildMantissaRationalForBinary(this.#value, this.#scale, bits);
        const scaled = roundedAbsScaled(cur.numer, cur.denom, digits);
        const threshold = 1024n * pow10BigInt(digits);
        if (scaled >= threshold && bits < 60) bits += 10;
      }

      const suffix = constructSuffix(2, bits, 'BinarySI');
      const r = buildMantissaRationalForBinary(this.#value, this.#scale, bits);

      if (roundInt) {
        // integer mantissa, ceil away from 0
        const { q } = divRoundAwayFromZero(r.numer, r.denom);
        return `${q.toString(10)}${suffix}`;
      }

      const mant = formatRationalDecimal(r.numer, r.denom, digits);
      return `${mant}${suffix}`;
    }

    // ===== DecimalSI / DecimalExponent display =====
    let exp10: number;
    if (typeof scaleOpt === 'string') {
      // 'auto' | 'preserve'
      exp10 = chooseAutoDecimalExponent(absValue, this.#scale);
    } else {
      exp10 = Number(scaleOpt);
    }

    // For DecimalSI, snap/clamp exponent to SI exponents.
    if (format === 'DecimalSI') {
      exp10 = clampToDecimalSIExponent(exp10);
    } else {
      // DecimalExponent: keep exp10 as-is, but still nice to align to multiples of 3 for readability
      // when user didn't force it.
      if (typeof scaleOpt === 'string') {
        exp10 = clampToDecimalSIExponent(exp10);
      }
    }

    // Same “bump if rounds to 1000” rule for auto-ish display.
    if (!roundInt && digits !== Infinity && (scaleOpt === 'auto' || scaleOpt === 'preserve')) {
      const cur = buildMantissaRationalForDecimal(this.#value, this.#scale, exp10);
      const scaled = roundedAbsScaled(cur.numer, cur.denom, digits);
      const threshold = 1000n * pow10BigInt(digits);
      if (scaled >= threshold && exp10 < 18) exp10 += 3;
    }

    // Suffix (fallback: if DecimalSI can't represent this exponent, show e{exp})
    let suffix = constructSuffix(10, exp10, format);
    if (format === 'DecimalSI' && suffix === '' && exp10 !== 0) {
      suffix = `e${exp10}`;
    }

    if (roundInt) {
      // integer mantissa in the chosen decimal exponent
      const { q } = scaledInt(this.#value, this.#scale, exp10);
      return `${q.toString(10)}${suffix}`;
    }

    const r = buildMantissaRationalForDecimal(this.#value, this.#scale, exp10);
    const mant = formatRationalDecimal(r.numer, r.denom, digits);
    return `${mant}${suffix}`;
  }

  /**
   * JSON.stringify() hook.
   *
   * Always emits a JSON string in canonical form.
   */
  toJSON(): string {
    return this.toString();
  }

  /**
   * Prevent implicit numeric conversion.
   *
   * - For `hint === "string"`, returns the canonical string (same as `toString()`).
   * - Otherwise throws `TypeError` to avoid treating quantities as numbers.
   */
  [Symbol.toPrimitive](hint: 'string' | 'number' | 'default'): string {
    if (hint === 'string') return this.toString();
    throw new TypeError('Quantity cannot be converted to a number implicitly');
  }

  get [Symbol.toStringTag](): 'Quantity' {
    return 'Quantity';
  }

  /**
   * Compare by numeric value.
   *
   * @returns -1 if this < other, 0 if equal, 1 if this > other
   */
  cmp(other: Quantity): -1 | 0 | 1 {
    return compareAmounts(this.#value, this.#scale, other.#value, other.#scale);
  }

  /** Numeric equality (does not compare `format`). */
  equals(other: Quantity): boolean {
    return this.cmp(other) === 0;
  }

  /**
   * Integer value at scale 0, rounded away from 0 (Kubernetes ScaledValue semantics).
   *
   * Equivalent to `scaledValue(Scale.None)`.
   */
  value(): bigint {
    return this.scaledValue(ScaleConst.None);
  }

  /**
   * Milli value, rounded away from 0.
   *
   * Equivalent to `scaledValue(Scale.Milli)`.
   */
  milliValue(): bigint {
    return this.scaledValue(ScaleConst.Milli);
  }

  /**
   * Return the value of `ceilAwayFromZero(q / 10^scale)` using int64-like semantics,
   * but returned as `bigint` to avoid JS overflow.
   *
   * This matches Kubernetes `ScaledValue(scale)` rounding behavior.
   */
  scaledValue(scale: Scale): bigint {
    const { q } = scaledInt(this.#value, this.#scale, Number(scale));
    return q;
  }

  /**
   * Canonicalize and return the Kubernetes quantity string.
   *
   * The output:
   * - preserves numeric precision,
   * - never contains fractional digits,
   * - and uses the largest possible exponent/suffix.
   */
  #canonicalizeString(): string {
    if (this.#value === 0n) return '0';

    let format: Format = this.format;
    let roundedIntForBinary: bigint | undefined;

    if (format === 'BinarySI') {
      // If value is in (-1024, 1024), emit DecimalSI to avoid confusion.
      if (
        compareAmounts(this.#value, this.#scale, -1024n, 0) > 0 &&
        compareAmounts(this.#value, this.#scale, 1024n, 0) < 0
      ) {
        format = 'DecimalSI';
      } else {
        const { q, exact } = scaledInt(this.#value, this.#scale, 0);
        if (!exact) {
          // Don't lose precision--show as DecimalSI.
          format = 'DecimalSI';
        } else {
          roundedIntForBinary = q;
        }
      }
    } else if (format !== 'DecimalExponent' && format !== 'DecimalSI') {
      format = 'DecimalExponent';
    }

    if (format === 'DecimalExponent' || format === 'DecimalSI') {
      const dec = new Amount(this.#value, this.#scale).asCanonicalDecimal();
      return `${dec.mantissa}${constructSuffix(10, dec.exponent, format)}`;
    }

    // BinarySI
    const amountForBinary =
      roundedIntForBinary === undefined
        ? new Amount(this.#value, this.#scale)
        : new Amount(roundedIntForBinary, 0);
    const base1024 = amountForBinary.asCanonicalBase1024();
    return `${base1024.mantissa}${constructSuffix(2, base1024.exponent * 10, 'BinarySI')}`;
  }

  /**
   * Add two quantities and return a new immutable `Quantity`.
   *
   * Format inheritance matches Kubernetes:
   * - If `this` is zero, the result uses `other.format`.
   * - Otherwise, the result uses `this.format`.
   */
  add(other: Quantity): Quantity {
    if (this.#value === 0n) {
      return new Quantity(other.#value, other.#scale, other.format);
    }

    const resultScale = Math.min(this.#scale, other.#scale);
    const a = this.#value * pow10BigInt(this.#scale - resultScale);
    const b = other.#value * pow10BigInt(other.#scale - resultScale);
    let v = a + b;
    let s = resultScale;

    const rounded = roundToMinScale(v, s, -9);
    v = rounded.value;
    s = rounded.scale;

    const capped = capToMaxAllowed(v, s);
    const normalized = normalizeDecimal(capped.value, capped.scale);
    return new Quantity(normalized.value, normalized.scale, this.format);
  }

  /**
   * Subtract two quantities and return a new immutable `Quantity`.
   *
   * Format inheritance matches Kubernetes (same as `add()`).
   */
  sub(other: Quantity): Quantity {
    return this.add(other.neg());
  }

  /**
   * Multiply by an int64-like integer.
   *
   * @returns `{ result, exact }` where `exact=false` indicates rounding/capping occurred.
   */
  mul(y: bigint): { result: Quantity; exact: boolean } {
    if (y === 0n || this.#value === 0n) {
      return { result: new Quantity(0n, 0, this.format), exact: true };
    }

    let v = this.#value * y;
    let s = this.#scale;
    let exact = true;

    const rounded = roundToMinScale(v, s, -9);
    v = rounded.value;
    s = rounded.scale;
    exact = exact && rounded.exact;

    const capped = capToMaxAllowed(v, s);
    v = capped.value;
    s = capped.scale;
    exact = exact && !capped.capped;

    const normalized = normalizeDecimal(v, s);
    return { result: new Quantity(normalized.value, normalized.scale, this.format), exact };
  }

  /** Return the negated quantity. */
  neg(): Quantity {
    if (this.#value === 0n) return this;
    return new Quantity(-this.#value, this.#scale, this.format);
  }

  /**
   * Round away from 0 at the given scale and return a new immutable `Quantity`.
   *
   * Negative values are rounded away from zero, e.g. (-9, scale=1) => -10.
   *
   * @returns `{ result, exact }` where `exact=false` indicates precision loss due to rounding/capping.
   */
  roundUp(scale: Scale): { result: Quantity; exact: boolean } {
    const target = Number(scale);
    if (this.#value === 0n) return { result: this, exact: true };
    if (this.#scale >= target) return { result: this, exact: true };

    const diff = target - this.#scale;
    const d = pow10BigInt(diff);
    const { q, exact } = divRoundAwayFromZero(this.#value, d);

    const capped = capToMaxAllowed(q, target);
    const normalized = normalizeDecimal(capped.value, capped.scale);
    return {
      result: new Quantity(normalized.value, normalized.scale, this.format),
      exact: exact && !capped.capped
    };
  }

  /**
   * Return a new quantity with the same numeric value but a different format category.
   *
   * This affects how the quantity is serialized (after canonicalization).
   */
  withFormat(format: Format): Quantity {
    if (this.format === format) return this;
    return new Quantity(this.#value, this.#scale, format);
  }
}
