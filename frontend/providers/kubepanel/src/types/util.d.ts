/**
 * Set some properties to be optional
 *
 * @typeParam T Type
 * @typeParam K Keys
 * @example Optional<{a: string, b: number}, 'a'> = {a: string | undefined, b: number}
 * @example Optional<{a: string, b: number}, 'a' | 'b'> = {a: string | undefined, b: number | undefined}
 */
type Optional<T, K extends PropertyKey> = Merge<
  { [P in K]?: T[P] },
  {
    [P in Exclude<keyof T, K>]: T[P];
  }
>;

/**
 * Merge two types for a better prompting effect
 *
 * @example Merge<{a: string}, {b: number}> = {a: string, b: number}
 */
type Merge<T, U> = {
  [P in keyof T | keyof U]: P extends keyof U ? U[P] : P extends keyof T ? T[P] : never;
};
