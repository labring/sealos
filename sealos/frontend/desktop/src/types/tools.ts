export type Primitive = undefined | null | boolean | string | number | symbol | bigint | Function;

export type DeepRequired<T> = T extends Primitive
  ? NonNullable<T>
  : {
      [P in keyof T]-?: T[P] extends Array<infer U>
        ? Array<DeepRequired<U>>
        : T[P] extends ReadonlyArray<infer V>
        ? DeepRequired<V>
        : DeepRequired<T[P]>;
    };
export type Replace<Obj, k extends keyof Obj, v> = k extends keyof Obj
  ? { [p in keyof Obj]: p extends k ? v : Obj[p] }
  : never;

export type OmitPath<
  Obj extends unknown,
  Path extends string
> = Path extends `${infer p}.${infer Rest}`
  ? p extends keyof Obj
    ? Replace<Obj, p, OmitPath<NonNullable<Obj[p]>, Rest>>
    : Obj
  : Path extends keyof Obj
  ? { [P in Exclude<keyof Obj, Path>]: Obj[P] }
  : Obj;

export type OmitPathArr<Obj, Paths extends unknown[]> = Paths extends [infer Head, ...infer Rest]
  ? Head extends string
    ? OmitPathArr<OmitPath<Obj, Head>, Rest>
    : never
  : Obj;
export type ValueOf<T extends object> = T[keyof T];
export type AsyncResult<
  TData extends unknown,
  StatusUnion extends unknown,
  SuccessStatus extends StatusUnion
> = [TData] extends [never]
  ? { status: StatusUnion }
  :
      | {
          status: SuccessStatus;
          data: TData;
        }
      | { status: Exclude<StatusUnion, SuccessStatus> };
