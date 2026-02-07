import { QuantityParseError } from './errors';
import { Scale as ScaleConst, type Format, type Scale } from './types';

const MAX_INT64: bigint = (1n << 63n) - 1n;

const absBigInt = (v: bigint): bigint => (v < 0n ? -v : v);

const pow10BigInt = (exp: number): bigint => {
  if (!Number.isInteger(exp) || exp < 0) {
    throw new RangeError(`pow10 exponent must be a non-negative integer, got: ${exp}`);
  }
  let result = 1n;
  let base = 10n;
  let e = exp;
  while (e > 0) {
    if (e & 1) result *= base;
    base *= base;
    e >>= 1;
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
   * This is the string used for JSON serialization as well.
   */
  toString(): string {
    const cached = stringCache.get(this);
    if (cached !== undefined) return cached;
    const s = this.#canonicalizeString();
    stringCache.set(this, s);
    return s;
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
