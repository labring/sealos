
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Organization
 * 
 */
export type Organization = $Result.DefaultSelection<Prisma.$OrganizationPayload>
/**
 * Model UserOrganization
 * 
 */
export type UserOrganization = $Result.DefaultSelection<Prisma.$UserOrganizationPayload>
/**
 * Model TemplateRepository
 * 
 */
export type TemplateRepository = $Result.DefaultSelection<Prisma.$TemplateRepositoryPayload>
/**
 * Model Template
 * 
 */
export type Template = $Result.DefaultSelection<Prisma.$TemplatePayload>
/**
 * Model Tag
 * 
 */
export type Tag = $Result.DefaultSelection<Prisma.$TagPayload>
/**
 * Model TemplateRepositoryTag
 * 
 */
export type TemplateRepositoryTag = $Result.DefaultSelection<Prisma.$TemplateRepositoryTagPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const TemplateRepositoryKind: {
  FRAMEWORK: 'FRAMEWORK',
  OS: 'OS',
  LANGUAGE: 'LANGUAGE',
  CUSTOM: 'CUSTOM'
};

export type TemplateRepositoryKind = (typeof TemplateRepositoryKind)[keyof typeof TemplateRepositoryKind]

}

export type TemplateRepositoryKind = $Enums.TemplateRepositoryKind

export const TemplateRepositoryKind: typeof $Enums.TemplateRepositoryKind

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof T ? T['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<T['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<T, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<'extends', Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.organization`: Exposes CRUD operations for the **Organization** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Organizations
    * const organizations = await prisma.organization.findMany()
    * ```
    */
  get organization(): Prisma.OrganizationDelegate<ExtArgs>;

  /**
   * `prisma.userOrganization`: Exposes CRUD operations for the **UserOrganization** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserOrganizations
    * const userOrganizations = await prisma.userOrganization.findMany()
    * ```
    */
  get userOrganization(): Prisma.UserOrganizationDelegate<ExtArgs>;

  /**
   * `prisma.templateRepository`: Exposes CRUD operations for the **TemplateRepository** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TemplateRepositories
    * const templateRepositories = await prisma.templateRepository.findMany()
    * ```
    */
  get templateRepository(): Prisma.TemplateRepositoryDelegate<ExtArgs>;

  /**
   * `prisma.template`: Exposes CRUD operations for the **Template** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Templates
    * const templates = await prisma.template.findMany()
    * ```
    */
  get template(): Prisma.TemplateDelegate<ExtArgs>;

  /**
   * `prisma.tag`: Exposes CRUD operations for the **Tag** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tags
    * const tags = await prisma.tag.findMany()
    * ```
    */
  get tag(): Prisma.TagDelegate<ExtArgs>;

  /**
   * `prisma.templateRepositoryTag`: Exposes CRUD operations for the **TemplateRepositoryTag** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TemplateRepositoryTags
    * const templateRepositoryTags = await prisma.templateRepositoryTag.findMany()
    * ```
    */
  get templateRepositoryTag(): Prisma.TemplateRepositoryTagDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.10.2
   * Query Engine version: 5a9203d0590c951969e85a7d07215503f4672eb9
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON object.
   * This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. 
   */
  export type JsonObject = {[Key in string]?: JsonValue}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON array.
   */
  export interface JsonArray extends Array<JsonValue> {}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches any valid JSON value.
   */
  export type JsonValue = string | number | boolean | JsonObject | JsonArray | null

  /**
   * Matches a JSON object.
   * Unlike `JsonObject`, this type allows undefined and read-only properties.
   */
  export type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}

  /**
   * Matches a JSON array.
   * Unlike `JsonArray`, readonly arrays are assignable to this type.
   */
  export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}

  /**
   * Matches any valid value that can be used as an input for operations like
   * create and update as the value of a JSON field. Unlike `JsonValue`, this
   * type allows read-only arrays and read-only object properties and disallows
   * `null` at the top level.
   *
   * `null` cannot be used as the value of a JSON field because its meaning
   * would be ambiguous. Use `Prisma.JsonNull` to store the JSON null value or
   * `Prisma.DbNull` to clear the JSON value and set the field to the database
   * NULL value instead.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
   */
  export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown }

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Organization: 'Organization',
    UserOrganization: 'UserOrganization',
    TemplateRepository: 'TemplateRepository',
    Template: 'Template',
    Tag: 'Tag',
    TemplateRepositoryTag: 'TemplateRepositoryTag'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }


  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs}, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meta: {
      modelProps: 'user' | 'organization' | 'userOrganization' | 'templateRepository' | 'template' | 'tag' | 'templateRepositoryTag'
      txIsolationLevel: Prisma.TransactionIsolationLevel
    },
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>,
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>,
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Organization: {
        payload: Prisma.$OrganizationPayload<ExtArgs>
        fields: Prisma.OrganizationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrganizationFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrganizationFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findFirst: {
            args: Prisma.OrganizationFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrganizationFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findMany: {
            args: Prisma.OrganizationFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>[]
          }
          create: {
            args: Prisma.OrganizationCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          createMany: {
            args: Prisma.OrganizationCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.OrganizationDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          update: {
            args: Prisma.OrganizationUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          deleteMany: {
            args: Prisma.OrganizationDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.OrganizationUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.OrganizationUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          aggregate: {
            args: Prisma.OrganizationAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateOrganization>
          }
          groupBy: {
            args: Prisma.OrganizationGroupByArgs<ExtArgs>,
            result: $Utils.Optional<OrganizationGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrganizationCountArgs<ExtArgs>,
            result: $Utils.Optional<OrganizationCountAggregateOutputType> | number
          }
        }
      }
      UserOrganization: {
        payload: Prisma.$UserOrganizationPayload<ExtArgs>
        fields: Prisma.UserOrganizationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserOrganizationFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserOrganizationFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload>
          }
          findFirst: {
            args: Prisma.UserOrganizationFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserOrganizationFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload>
          }
          findMany: {
            args: Prisma.UserOrganizationFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload>[]
          }
          create: {
            args: Prisma.UserOrganizationCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload>
          }
          createMany: {
            args: Prisma.UserOrganizationCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.UserOrganizationDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload>
          }
          update: {
            args: Prisma.UserOrganizationUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload>
          }
          deleteMany: {
            args: Prisma.UserOrganizationDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.UserOrganizationUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.UserOrganizationUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserOrganizationPayload>
          }
          aggregate: {
            args: Prisma.UserOrganizationAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateUserOrganization>
          }
          groupBy: {
            args: Prisma.UserOrganizationGroupByArgs<ExtArgs>,
            result: $Utils.Optional<UserOrganizationGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserOrganizationCountArgs<ExtArgs>,
            result: $Utils.Optional<UserOrganizationCountAggregateOutputType> | number
          }
        }
      }
      TemplateRepository: {
        payload: Prisma.$TemplateRepositoryPayload<ExtArgs>
        fields: Prisma.TemplateRepositoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TemplateRepositoryFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TemplateRepositoryFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload>
          }
          findFirst: {
            args: Prisma.TemplateRepositoryFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TemplateRepositoryFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload>
          }
          findMany: {
            args: Prisma.TemplateRepositoryFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload>[]
          }
          create: {
            args: Prisma.TemplateRepositoryCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload>
          }
          createMany: {
            args: Prisma.TemplateRepositoryCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.TemplateRepositoryDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload>
          }
          update: {
            args: Prisma.TemplateRepositoryUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload>
          }
          deleteMany: {
            args: Prisma.TemplateRepositoryDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.TemplateRepositoryUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.TemplateRepositoryUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryPayload>
          }
          aggregate: {
            args: Prisma.TemplateRepositoryAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateTemplateRepository>
          }
          groupBy: {
            args: Prisma.TemplateRepositoryGroupByArgs<ExtArgs>,
            result: $Utils.Optional<TemplateRepositoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.TemplateRepositoryCountArgs<ExtArgs>,
            result: $Utils.Optional<TemplateRepositoryCountAggregateOutputType> | number
          }
        }
      }
      Template: {
        payload: Prisma.$TemplatePayload<ExtArgs>
        fields: Prisma.TemplateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TemplateFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TemplateFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload>
          }
          findFirst: {
            args: Prisma.TemplateFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TemplateFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload>
          }
          findMany: {
            args: Prisma.TemplateFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload>[]
          }
          create: {
            args: Prisma.TemplateCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload>
          }
          createMany: {
            args: Prisma.TemplateCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.TemplateDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload>
          }
          update: {
            args: Prisma.TemplateUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload>
          }
          deleteMany: {
            args: Prisma.TemplateDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.TemplateUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.TemplateUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplatePayload>
          }
          aggregate: {
            args: Prisma.TemplateAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateTemplate>
          }
          groupBy: {
            args: Prisma.TemplateGroupByArgs<ExtArgs>,
            result: $Utils.Optional<TemplateGroupByOutputType>[]
          }
          count: {
            args: Prisma.TemplateCountArgs<ExtArgs>,
            result: $Utils.Optional<TemplateCountAggregateOutputType> | number
          }
        }
      }
      Tag: {
        payload: Prisma.$TagPayload<ExtArgs>
        fields: Prisma.TagFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TagFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TagFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          findFirst: {
            args: Prisma.TagFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TagFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          findMany: {
            args: Prisma.TagFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload>[]
          }
          create: {
            args: Prisma.TagCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          createMany: {
            args: Prisma.TagCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.TagDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          update: {
            args: Prisma.TagUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          deleteMany: {
            args: Prisma.TagDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.TagUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.TagUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          aggregate: {
            args: Prisma.TagAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateTag>
          }
          groupBy: {
            args: Prisma.TagGroupByArgs<ExtArgs>,
            result: $Utils.Optional<TagGroupByOutputType>[]
          }
          count: {
            args: Prisma.TagCountArgs<ExtArgs>,
            result: $Utils.Optional<TagCountAggregateOutputType> | number
          }
        }
      }
      TemplateRepositoryTag: {
        payload: Prisma.$TemplateRepositoryTagPayload<ExtArgs>
        fields: Prisma.TemplateRepositoryTagFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TemplateRepositoryTagFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TemplateRepositoryTagFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload>
          }
          findFirst: {
            args: Prisma.TemplateRepositoryTagFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TemplateRepositoryTagFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload>
          }
          findMany: {
            args: Prisma.TemplateRepositoryTagFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload>[]
          }
          create: {
            args: Prisma.TemplateRepositoryTagCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload>
          }
          createMany: {
            args: Prisma.TemplateRepositoryTagCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.TemplateRepositoryTagDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload>
          }
          update: {
            args: Prisma.TemplateRepositoryTagUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload>
          }
          deleteMany: {
            args: Prisma.TemplateRepositoryTagDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.TemplateRepositoryTagUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.TemplateRepositoryTagUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$TemplateRepositoryTagPayload>
          }
          aggregate: {
            args: Prisma.TemplateRepositoryTagAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateTemplateRepositoryTag>
          }
          groupBy: {
            args: Prisma.TemplateRepositoryTagGroupByArgs<ExtArgs>,
            result: $Utils.Optional<TemplateRepositoryTagGroupByOutputType>[]
          }
          count: {
            args: Prisma.TemplateRepositoryTagCountArgs<ExtArgs>,
            result: $Utils.Optional<TemplateRepositoryTagCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<'define', Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    userOrganizations: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userOrganizations?: boolean | UserCountOutputTypeCountUserOrganizationsArgs
  }

  // Custom InputTypes

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUserOrganizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserOrganizationWhereInput
  }



  /**
   * Count Type OrganizationCountOutputType
   */

  export type OrganizationCountOutputType = {
    userOrganizations: number
    templateRepositories: number
  }

  export type OrganizationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userOrganizations?: boolean | OrganizationCountOutputTypeCountUserOrganizationsArgs
    templateRepositories?: boolean | OrganizationCountOutputTypeCountTemplateRepositoriesArgs
  }

  // Custom InputTypes

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationCountOutputType
     */
    select?: OrganizationCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountUserOrganizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserOrganizationWhereInput
  }


  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountTemplateRepositoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateRepositoryWhereInput
  }



  /**
   * Count Type TemplateRepositoryCountOutputType
   */

  export type TemplateRepositoryCountOutputType = {
    templates: number
    templateRepositoryTags: number
  }

  export type TemplateRepositoryCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    templates?: boolean | TemplateRepositoryCountOutputTypeCountTemplatesArgs
    templateRepositoryTags?: boolean | TemplateRepositoryCountOutputTypeCountTemplateRepositoryTagsArgs
  }

  // Custom InputTypes

  /**
   * TemplateRepositoryCountOutputType without action
   */
  export type TemplateRepositoryCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryCountOutputType
     */
    select?: TemplateRepositoryCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * TemplateRepositoryCountOutputType without action
   */
  export type TemplateRepositoryCountOutputTypeCountTemplatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateWhereInput
  }


  /**
   * TemplateRepositoryCountOutputType without action
   */
  export type TemplateRepositoryCountOutputTypeCountTemplateRepositoryTagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateRepositoryTagWhereInput
  }



  /**
   * Count Type TemplateCountOutputType
   */

  export type TemplateCountOutputType = {
    children: number
  }

  export type TemplateCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    children?: boolean | TemplateCountOutputTypeCountChildrenArgs
  }

  // Custom InputTypes

  /**
   * TemplateCountOutputType without action
   */
  export type TemplateCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateCountOutputType
     */
    select?: TemplateCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * TemplateCountOutputType without action
   */
  export type TemplateCountOutputTypeCountChildrenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateWhereInput
  }



  /**
   * Count Type TagCountOutputType
   */

  export type TagCountOutputType = {
    templateRepositoryTags: number
  }

  export type TagCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    templateRepositoryTags?: boolean | TagCountOutputTypeCountTemplateRepositoryTagsArgs
  }

  // Custom InputTypes

  /**
   * TagCountOutputType without action
   */
  export type TagCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TagCountOutputType
     */
    select?: TagCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * TagCountOutputType without action
   */
  export type TagCountOutputTypeCountTemplateRepositoryTagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateRepositoryTagWhereInput
  }



  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    uid: string | null
    regionUid: string | null
    namespaceId: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    isDeleted: boolean | null
  }

  export type UserMaxAggregateOutputType = {
    uid: string | null
    regionUid: string | null
    namespaceId: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    isDeleted: boolean | null
  }

  export type UserCountAggregateOutputType = {
    uid: number
    regionUid: number
    namespaceId: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    isDeleted: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    uid?: true
    regionUid?: true
    namespaceId?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    isDeleted?: true
  }

  export type UserMaxAggregateInputType = {
    uid?: true
    regionUid?: true
    namespaceId?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    isDeleted?: true
  }

  export type UserCountAggregateInputType = {
    uid?: true
    regionUid?: true
    namespaceId?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    isDeleted?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    uid: string
    regionUid: string
    namespaceId: string
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    isDeleted: boolean | null
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    uid?: boolean
    regionUid?: boolean
    namespaceId?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    isDeleted?: boolean
    userOrganizations?: boolean | User$userOrganizationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    uid?: boolean
    regionUid?: boolean
    namespaceId?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    isDeleted?: boolean
  }

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userOrganizations?: boolean | User$userOrganizationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      userOrganizations: Prisma.$UserOrganizationPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      uid: string
      regionUid: string
      namespaceId: string
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
      isDeleted: boolean | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }


  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends UserFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends UserFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `uid`
     * const userWithUidOnly = await prisma.user.findMany({ select: { uid: true } })
     * 
    **/
    findMany<T extends UserFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
    **/
    create<T extends UserCreateArgs<ExtArgs>>(
      args: SelectSubset<T, UserCreateArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Users.
     *     @param {UserCreateManyArgs} args - Arguments to create many Users.
     *     @example
     *     // Create many Users
     *     const user = await prisma.user.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends UserCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
    **/
    delete<T extends UserDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, UserDeleteArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends UserUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, UserUpdateArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends UserDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends UserUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
    **/
    upsert<T extends UserUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, UserUpsertArgs<ExtArgs>>
    ): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    userOrganizations<T extends User$userOrganizationsArgs<ExtArgs> = {}>(args?: Subset<T, User$userOrganizationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly uid: FieldRef<"User", 'String'>
    readonly regionUid: FieldRef<"User", 'String'>
    readonly namespaceId: FieldRef<"User", 'String'>
    readonly deletedAt: FieldRef<"User", 'DateTime'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly isDeleted: FieldRef<"User", 'Boolean'>
  }
    

  // Custom InputTypes

  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }


  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }


  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }


  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }


  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }


  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }


  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }


  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }


  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }


  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }


  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }


  /**
   * User.userOrganizations
   */
  export type User$userOrganizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    where?: UserOrganizationWhereInput
    orderBy?: UserOrganizationOrderByWithRelationInput | UserOrganizationOrderByWithRelationInput[]
    cursor?: UserOrganizationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserOrganizationScalarFieldEnum | UserOrganizationScalarFieldEnum[]
  }


  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserInclude<ExtArgs> | null
  }



  /**
   * Model Organization
   */

  export type AggregateOrganization = {
    _count: OrganizationCountAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  export type OrganizationMinAggregateOutputType = {
    uid: string | null
    id: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
    isDeleted: boolean | null
    name: string | null
  }

  export type OrganizationMaxAggregateOutputType = {
    uid: string | null
    id: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
    isDeleted: boolean | null
    name: string | null
  }

  export type OrganizationCountAggregateOutputType = {
    uid: number
    id: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    isDeleted: number
    name: number
    _all: number
  }


  export type OrganizationMinAggregateInputType = {
    uid?: true
    id?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    isDeleted?: true
    name?: true
  }

  export type OrganizationMaxAggregateInputType = {
    uid?: true
    id?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    isDeleted?: true
    name?: true
  }

  export type OrganizationCountAggregateInputType = {
    uid?: true
    id?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    isDeleted?: true
    name?: true
    _all?: true
  }

  export type OrganizationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organization to aggregate.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Organizations
    **/
    _count?: true | OrganizationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrganizationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrganizationMaxAggregateInputType
  }

  export type GetOrganizationAggregateType<T extends OrganizationAggregateArgs> = {
        [P in keyof T & keyof AggregateOrganization]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrganization[P]>
      : GetScalarType<T[P], AggregateOrganization[P]>
  }




  export type OrganizationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationWhereInput
    orderBy?: OrganizationOrderByWithAggregationInput | OrganizationOrderByWithAggregationInput[]
    by: OrganizationScalarFieldEnum[] | OrganizationScalarFieldEnum
    having?: OrganizationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrganizationCountAggregateInputType | true
    _min?: OrganizationMinAggregateInputType
    _max?: OrganizationMaxAggregateInputType
  }

  export type OrganizationGroupByOutputType = {
    uid: string
    id: string
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    isDeleted: boolean | null
    name: string
    _count: OrganizationCountAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  type GetOrganizationGroupByPayload<T extends OrganizationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrganizationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrganizationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
            : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
        }
      >
    >


  export type OrganizationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    uid?: boolean
    id?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    isDeleted?: boolean
    name?: boolean
    userOrganizations?: boolean | Organization$userOrganizationsArgs<ExtArgs>
    templateRepositories?: boolean | Organization$templateRepositoriesArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["organization"]>

  export type OrganizationSelectScalar = {
    uid?: boolean
    id?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    isDeleted?: boolean
    name?: boolean
  }

  export type OrganizationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userOrganizations?: boolean | Organization$userOrganizationsArgs<ExtArgs>
    templateRepositories?: boolean | Organization$templateRepositoriesArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $OrganizationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Organization"
    objects: {
      userOrganizations: Prisma.$UserOrganizationPayload<ExtArgs>[]
      templateRepositories: Prisma.$TemplateRepositoryPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      uid: string
      id: string
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
      isDeleted: boolean | null
      name: string
    }, ExtArgs["result"]["organization"]>
    composites: {}
  }


  type OrganizationGetPayload<S extends boolean | null | undefined | OrganizationDefaultArgs> = $Result.GetResult<Prisma.$OrganizationPayload, S>

  type OrganizationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OrganizationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OrganizationCountAggregateInputType | true
    }

  export interface OrganizationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Organization'], meta: { name: 'Organization' } }
    /**
     * Find zero or one Organization that matches the filter.
     * @param {OrganizationFindUniqueArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends OrganizationFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationFindUniqueArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Organization that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {OrganizationFindUniqueOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends OrganizationFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Organization that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends OrganizationFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindFirstArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Organization that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends OrganizationFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Organizations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Organizations
     * const organizations = await prisma.organization.findMany()
     * 
     * // Get first 10 Organizations
     * const organizations = await prisma.organization.findMany({ take: 10 })
     * 
     * // Only select the `uid`
     * const organizationWithUidOnly = await prisma.organization.findMany({ select: { uid: true } })
     * 
    **/
    findMany<T extends OrganizationFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Organization.
     * @param {OrganizationCreateArgs} args - Arguments to create a Organization.
     * @example
     * // Create one Organization
     * const Organization = await prisma.organization.create({
     *   data: {
     *     // ... data to create a Organization
     *   }
     * })
     * 
    **/
    create<T extends OrganizationCreateArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationCreateArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Organizations.
     *     @param {OrganizationCreateManyArgs} args - Arguments to create many Organizations.
     *     @example
     *     // Create many Organizations
     *     const organization = await prisma.organization.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends OrganizationCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Organization.
     * @param {OrganizationDeleteArgs} args - Arguments to delete one Organization.
     * @example
     * // Delete one Organization
     * const Organization = await prisma.organization.delete({
     *   where: {
     *     // ... filter to delete one Organization
     *   }
     * })
     * 
    **/
    delete<T extends OrganizationDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationDeleteArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Organization.
     * @param {OrganizationUpdateArgs} args - Arguments to update one Organization.
     * @example
     * // Update one Organization
     * const organization = await prisma.organization.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends OrganizationUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationUpdateArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Organizations.
     * @param {OrganizationDeleteManyArgs} args - Arguments to filter Organizations to delete.
     * @example
     * // Delete a few Organizations
     * const { count } = await prisma.organization.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends OrganizationDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Organizations
     * const organization = await prisma.organization.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends OrganizationUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Organization.
     * @param {OrganizationUpsertArgs} args - Arguments to update or create a Organization.
     * @example
     * // Update or create a Organization
     * const organization = await prisma.organization.upsert({
     *   create: {
     *     // ... data to create a Organization
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Organization we want to update
     *   }
     * })
    **/
    upsert<T extends OrganizationUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationUpsertArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationCountArgs} args - Arguments to filter Organizations to count.
     * @example
     * // Count the number of Organizations
     * const count = await prisma.organization.count({
     *   where: {
     *     // ... the filter for the Organizations we want to count
     *   }
     * })
    **/
    count<T extends OrganizationCountArgs>(
      args?: Subset<T, OrganizationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrganizationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrganizationAggregateArgs>(args: Subset<T, OrganizationAggregateArgs>): Prisma.PrismaPromise<GetOrganizationAggregateType<T>>

    /**
     * Group by Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrganizationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrganizationGroupByArgs['orderBy'] }
        : { orderBy?: OrganizationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrganizationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrganizationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Organization model
   */
  readonly fields: OrganizationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Organization.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrganizationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    userOrganizations<T extends Organization$userOrganizationsArgs<ExtArgs> = {}>(args?: Subset<T, Organization$userOrganizationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'findMany'> | Null>;

    templateRepositories<T extends Organization$templateRepositoriesArgs<ExtArgs> = {}>(args?: Subset<T, Organization$templateRepositoriesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Organization model
   */ 
  interface OrganizationFieldRefs {
    readonly uid: FieldRef<"Organization", 'String'>
    readonly id: FieldRef<"Organization", 'String'>
    readonly createdAt: FieldRef<"Organization", 'DateTime'>
    readonly updatedAt: FieldRef<"Organization", 'DateTime'>
    readonly deletedAt: FieldRef<"Organization", 'DateTime'>
    readonly isDeleted: FieldRef<"Organization", 'Boolean'>
    readonly name: FieldRef<"Organization", 'String'>
  }
    

  // Custom InputTypes

  /**
   * Organization findUnique
   */
  export type OrganizationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization findUniqueOrThrow
   */
  export type OrganizationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization findFirst
   */
  export type OrganizationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }


  /**
   * Organization findFirstOrThrow
   */
  export type OrganizationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }


  /**
   * Organization findMany
   */
  export type OrganizationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organizations to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }


  /**
   * Organization create
   */
  export type OrganizationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to create a Organization.
     */
    data: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
  }


  /**
   * Organization createMany
   */
  export type OrganizationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Organizations.
     */
    data: OrganizationCreateManyInput | OrganizationCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * Organization update
   */
  export type OrganizationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to update a Organization.
     */
    data: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
    /**
     * Choose, which Organization to update.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization updateMany
   */
  export type OrganizationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Organizations.
     */
    data: XOR<OrganizationUpdateManyMutationInput, OrganizationUncheckedUpdateManyInput>
    /**
     * Filter which Organizations to update
     */
    where?: OrganizationWhereInput
  }


  /**
   * Organization upsert
   */
  export type OrganizationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The filter to search for the Organization to update in case it exists.
     */
    where: OrganizationWhereUniqueInput
    /**
     * In case the Organization found by the `where` argument doesn't exist, create a new Organization with this data.
     */
    create: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
    /**
     * In case the Organization was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
  }


  /**
   * Organization delete
   */
  export type OrganizationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter which Organization to delete.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization deleteMany
   */
  export type OrganizationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organizations to delete
     */
    where?: OrganizationWhereInput
  }


  /**
   * Organization.userOrganizations
   */
  export type Organization$userOrganizationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    where?: UserOrganizationWhereInput
    orderBy?: UserOrganizationOrderByWithRelationInput | UserOrganizationOrderByWithRelationInput[]
    cursor?: UserOrganizationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserOrganizationScalarFieldEnum | UserOrganizationScalarFieldEnum[]
  }


  /**
   * Organization.templateRepositories
   */
  export type Organization$templateRepositoriesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    where?: TemplateRepositoryWhereInput
    orderBy?: TemplateRepositoryOrderByWithRelationInput | TemplateRepositoryOrderByWithRelationInput[]
    cursor?: TemplateRepositoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TemplateRepositoryScalarFieldEnum | TemplateRepositoryScalarFieldEnum[]
  }


  /**
   * Organization without action
   */
  export type OrganizationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
  }



  /**
   * Model UserOrganization
   */

  export type AggregateUserOrganization = {
    _count: UserOrganizationCountAggregateOutputType | null
    _min: UserOrganizationMinAggregateOutputType | null
    _max: UserOrganizationMaxAggregateOutputType | null
  }

  export type UserOrganizationMinAggregateOutputType = {
    createdAt: Date | null
    updatedAt: Date | null
    userUid: string | null
    organizationUid: string | null
  }

  export type UserOrganizationMaxAggregateOutputType = {
    createdAt: Date | null
    updatedAt: Date | null
    userUid: string | null
    organizationUid: string | null
  }

  export type UserOrganizationCountAggregateOutputType = {
    createdAt: number
    updatedAt: number
    userUid: number
    organizationUid: number
    _all: number
  }


  export type UserOrganizationMinAggregateInputType = {
    createdAt?: true
    updatedAt?: true
    userUid?: true
    organizationUid?: true
  }

  export type UserOrganizationMaxAggregateInputType = {
    createdAt?: true
    updatedAt?: true
    userUid?: true
    organizationUid?: true
  }

  export type UserOrganizationCountAggregateInputType = {
    createdAt?: true
    updatedAt?: true
    userUid?: true
    organizationUid?: true
    _all?: true
  }

  export type UserOrganizationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserOrganization to aggregate.
     */
    where?: UserOrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserOrganizations to fetch.
     */
    orderBy?: UserOrganizationOrderByWithRelationInput | UserOrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserOrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserOrganizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserOrganizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserOrganizations
    **/
    _count?: true | UserOrganizationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserOrganizationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserOrganizationMaxAggregateInputType
  }

  export type GetUserOrganizationAggregateType<T extends UserOrganizationAggregateArgs> = {
        [P in keyof T & keyof AggregateUserOrganization]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserOrganization[P]>
      : GetScalarType<T[P], AggregateUserOrganization[P]>
  }




  export type UserOrganizationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserOrganizationWhereInput
    orderBy?: UserOrganizationOrderByWithAggregationInput | UserOrganizationOrderByWithAggregationInput[]
    by: UserOrganizationScalarFieldEnum[] | UserOrganizationScalarFieldEnum
    having?: UserOrganizationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserOrganizationCountAggregateInputType | true
    _min?: UserOrganizationMinAggregateInputType
    _max?: UserOrganizationMaxAggregateInputType
  }

  export type UserOrganizationGroupByOutputType = {
    createdAt: Date
    updatedAt: Date
    userUid: string
    organizationUid: string
    _count: UserOrganizationCountAggregateOutputType | null
    _min: UserOrganizationMinAggregateOutputType | null
    _max: UserOrganizationMaxAggregateOutputType | null
  }

  type GetUserOrganizationGroupByPayload<T extends UserOrganizationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserOrganizationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserOrganizationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserOrganizationGroupByOutputType[P]>
            : GetScalarType<T[P], UserOrganizationGroupByOutputType[P]>
        }
      >
    >


  export type UserOrganizationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    createdAt?: boolean
    updatedAt?: boolean
    userUid?: boolean
    organizationUid?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userOrganization"]>

  export type UserOrganizationSelectScalar = {
    createdAt?: boolean
    updatedAt?: boolean
    userUid?: boolean
    organizationUid?: boolean
  }

  export type UserOrganizationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }


  export type $UserOrganizationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserOrganization"
    objects: {
      organization: Prisma.$OrganizationPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      createdAt: Date
      updatedAt: Date
      userUid: string
      organizationUid: string
    }, ExtArgs["result"]["userOrganization"]>
    composites: {}
  }


  type UserOrganizationGetPayload<S extends boolean | null | undefined | UserOrganizationDefaultArgs> = $Result.GetResult<Prisma.$UserOrganizationPayload, S>

  type UserOrganizationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserOrganizationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserOrganizationCountAggregateInputType | true
    }

  export interface UserOrganizationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserOrganization'], meta: { name: 'UserOrganization' } }
    /**
     * Find zero or one UserOrganization that matches the filter.
     * @param {UserOrganizationFindUniqueArgs} args - Arguments to find a UserOrganization
     * @example
     * // Get one UserOrganization
     * const userOrganization = await prisma.userOrganization.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends UserOrganizationFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, UserOrganizationFindUniqueArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one UserOrganization that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {UserOrganizationFindUniqueOrThrowArgs} args - Arguments to find a UserOrganization
     * @example
     * // Get one UserOrganization
     * const userOrganization = await prisma.userOrganization.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends UserOrganizationFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserOrganizationFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first UserOrganization that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserOrganizationFindFirstArgs} args - Arguments to find a UserOrganization
     * @example
     * // Get one UserOrganization
     * const userOrganization = await prisma.userOrganization.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends UserOrganizationFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, UserOrganizationFindFirstArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first UserOrganization that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserOrganizationFindFirstOrThrowArgs} args - Arguments to find a UserOrganization
     * @example
     * // Get one UserOrganization
     * const userOrganization = await prisma.userOrganization.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends UserOrganizationFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserOrganizationFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more UserOrganizations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserOrganizationFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserOrganizations
     * const userOrganizations = await prisma.userOrganization.findMany()
     * 
     * // Get first 10 UserOrganizations
     * const userOrganizations = await prisma.userOrganization.findMany({ take: 10 })
     * 
     * // Only select the `createdAt`
     * const userOrganizationWithCreatedAtOnly = await prisma.userOrganization.findMany({ select: { createdAt: true } })
     * 
    **/
    findMany<T extends UserOrganizationFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserOrganizationFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a UserOrganization.
     * @param {UserOrganizationCreateArgs} args - Arguments to create a UserOrganization.
     * @example
     * // Create one UserOrganization
     * const UserOrganization = await prisma.userOrganization.create({
     *   data: {
     *     // ... data to create a UserOrganization
     *   }
     * })
     * 
    **/
    create<T extends UserOrganizationCreateArgs<ExtArgs>>(
      args: SelectSubset<T, UserOrganizationCreateArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many UserOrganizations.
     *     @param {UserOrganizationCreateManyArgs} args - Arguments to create many UserOrganizations.
     *     @example
     *     // Create many UserOrganizations
     *     const userOrganization = await prisma.userOrganization.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends UserOrganizationCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserOrganizationCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a UserOrganization.
     * @param {UserOrganizationDeleteArgs} args - Arguments to delete one UserOrganization.
     * @example
     * // Delete one UserOrganization
     * const UserOrganization = await prisma.userOrganization.delete({
     *   where: {
     *     // ... filter to delete one UserOrganization
     *   }
     * })
     * 
    **/
    delete<T extends UserOrganizationDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, UserOrganizationDeleteArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one UserOrganization.
     * @param {UserOrganizationUpdateArgs} args - Arguments to update one UserOrganization.
     * @example
     * // Update one UserOrganization
     * const userOrganization = await prisma.userOrganization.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends UserOrganizationUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, UserOrganizationUpdateArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more UserOrganizations.
     * @param {UserOrganizationDeleteManyArgs} args - Arguments to filter UserOrganizations to delete.
     * @example
     * // Delete a few UserOrganizations
     * const { count } = await prisma.userOrganization.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends UserOrganizationDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserOrganizationDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserOrganizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserOrganizationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserOrganizations
     * const userOrganization = await prisma.userOrganization.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends UserOrganizationUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, UserOrganizationUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one UserOrganization.
     * @param {UserOrganizationUpsertArgs} args - Arguments to update or create a UserOrganization.
     * @example
     * // Update or create a UserOrganization
     * const userOrganization = await prisma.userOrganization.upsert({
     *   create: {
     *     // ... data to create a UserOrganization
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserOrganization we want to update
     *   }
     * })
    **/
    upsert<T extends UserOrganizationUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, UserOrganizationUpsertArgs<ExtArgs>>
    ): Prisma__UserOrganizationClient<$Result.GetResult<Prisma.$UserOrganizationPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of UserOrganizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserOrganizationCountArgs} args - Arguments to filter UserOrganizations to count.
     * @example
     * // Count the number of UserOrganizations
     * const count = await prisma.userOrganization.count({
     *   where: {
     *     // ... the filter for the UserOrganizations we want to count
     *   }
     * })
    **/
    count<T extends UserOrganizationCountArgs>(
      args?: Subset<T, UserOrganizationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserOrganizationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserOrganization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserOrganizationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserOrganizationAggregateArgs>(args: Subset<T, UserOrganizationAggregateArgs>): Prisma.PrismaPromise<GetUserOrganizationAggregateType<T>>

    /**
     * Group by UserOrganization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserOrganizationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserOrganizationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserOrganizationGroupByArgs['orderBy'] }
        : { orderBy?: UserOrganizationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserOrganizationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserOrganizationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserOrganization model
   */
  readonly fields: UserOrganizationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserOrganization.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserOrganizationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the UserOrganization model
   */ 
  interface UserOrganizationFieldRefs {
    readonly createdAt: FieldRef<"UserOrganization", 'DateTime'>
    readonly updatedAt: FieldRef<"UserOrganization", 'DateTime'>
    readonly userUid: FieldRef<"UserOrganization", 'String'>
    readonly organizationUid: FieldRef<"UserOrganization", 'String'>
  }
    

  // Custom InputTypes

  /**
   * UserOrganization findUnique
   */
  export type UserOrganizationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * Filter, which UserOrganization to fetch.
     */
    where: UserOrganizationWhereUniqueInput
  }


  /**
   * UserOrganization findUniqueOrThrow
   */
  export type UserOrganizationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * Filter, which UserOrganization to fetch.
     */
    where: UserOrganizationWhereUniqueInput
  }


  /**
   * UserOrganization findFirst
   */
  export type UserOrganizationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * Filter, which UserOrganization to fetch.
     */
    where?: UserOrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserOrganizations to fetch.
     */
    orderBy?: UserOrganizationOrderByWithRelationInput | UserOrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserOrganizations.
     */
    cursor?: UserOrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserOrganizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserOrganizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserOrganizations.
     */
    distinct?: UserOrganizationScalarFieldEnum | UserOrganizationScalarFieldEnum[]
  }


  /**
   * UserOrganization findFirstOrThrow
   */
  export type UserOrganizationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * Filter, which UserOrganization to fetch.
     */
    where?: UserOrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserOrganizations to fetch.
     */
    orderBy?: UserOrganizationOrderByWithRelationInput | UserOrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserOrganizations.
     */
    cursor?: UserOrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserOrganizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserOrganizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserOrganizations.
     */
    distinct?: UserOrganizationScalarFieldEnum | UserOrganizationScalarFieldEnum[]
  }


  /**
   * UserOrganization findMany
   */
  export type UserOrganizationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * Filter, which UserOrganizations to fetch.
     */
    where?: UserOrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserOrganizations to fetch.
     */
    orderBy?: UserOrganizationOrderByWithRelationInput | UserOrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserOrganizations.
     */
    cursor?: UserOrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserOrganizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserOrganizations.
     */
    skip?: number
    distinct?: UserOrganizationScalarFieldEnum | UserOrganizationScalarFieldEnum[]
  }


  /**
   * UserOrganization create
   */
  export type UserOrganizationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * The data needed to create a UserOrganization.
     */
    data: XOR<UserOrganizationCreateInput, UserOrganizationUncheckedCreateInput>
  }


  /**
   * UserOrganization createMany
   */
  export type UserOrganizationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserOrganizations.
     */
    data: UserOrganizationCreateManyInput | UserOrganizationCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * UserOrganization update
   */
  export type UserOrganizationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * The data needed to update a UserOrganization.
     */
    data: XOR<UserOrganizationUpdateInput, UserOrganizationUncheckedUpdateInput>
    /**
     * Choose, which UserOrganization to update.
     */
    where: UserOrganizationWhereUniqueInput
  }


  /**
   * UserOrganization updateMany
   */
  export type UserOrganizationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserOrganizations.
     */
    data: XOR<UserOrganizationUpdateManyMutationInput, UserOrganizationUncheckedUpdateManyInput>
    /**
     * Filter which UserOrganizations to update
     */
    where?: UserOrganizationWhereInput
  }


  /**
   * UserOrganization upsert
   */
  export type UserOrganizationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * The filter to search for the UserOrganization to update in case it exists.
     */
    where: UserOrganizationWhereUniqueInput
    /**
     * In case the UserOrganization found by the `where` argument doesn't exist, create a new UserOrganization with this data.
     */
    create: XOR<UserOrganizationCreateInput, UserOrganizationUncheckedCreateInput>
    /**
     * In case the UserOrganization was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserOrganizationUpdateInput, UserOrganizationUncheckedUpdateInput>
  }


  /**
   * UserOrganization delete
   */
  export type UserOrganizationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
    /**
     * Filter which UserOrganization to delete.
     */
    where: UserOrganizationWhereUniqueInput
  }


  /**
   * UserOrganization deleteMany
   */
  export type UserOrganizationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserOrganizations to delete
     */
    where?: UserOrganizationWhereInput
  }


  /**
   * UserOrganization without action
   */
  export type UserOrganizationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserOrganization
     */
    select?: UserOrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserOrganizationInclude<ExtArgs> | null
  }



  /**
   * Model TemplateRepository
   */

  export type AggregateTemplateRepository = {
    _count: TemplateRepositoryCountAggregateOutputType | null
    _min: TemplateRepositoryMinAggregateOutputType | null
    _max: TemplateRepositoryMaxAggregateOutputType | null
  }

  export type TemplateRepositoryMinAggregateOutputType = {
    uid: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    name: string | null
    description: string | null
    kind: $Enums.TemplateRepositoryKind | null
    organizationUid: string | null
    isPublic: boolean | null
    iconId: string | null
    isDeleted: boolean | null
  }

  export type TemplateRepositoryMaxAggregateOutputType = {
    uid: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    name: string | null
    description: string | null
    kind: $Enums.TemplateRepositoryKind | null
    organizationUid: string | null
    isPublic: boolean | null
    iconId: string | null
    isDeleted: boolean | null
  }

  export type TemplateRepositoryCountAggregateOutputType = {
    uid: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    name: number
    description: number
    kind: number
    organizationUid: number
    isPublic: number
    iconId: number
    isDeleted: number
    _all: number
  }


  export type TemplateRepositoryMinAggregateInputType = {
    uid?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    name?: true
    description?: true
    kind?: true
    organizationUid?: true
    isPublic?: true
    iconId?: true
    isDeleted?: true
  }

  export type TemplateRepositoryMaxAggregateInputType = {
    uid?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    name?: true
    description?: true
    kind?: true
    organizationUid?: true
    isPublic?: true
    iconId?: true
    isDeleted?: true
  }

  export type TemplateRepositoryCountAggregateInputType = {
    uid?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    name?: true
    description?: true
    kind?: true
    organizationUid?: true
    isPublic?: true
    iconId?: true
    isDeleted?: true
    _all?: true
  }

  export type TemplateRepositoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TemplateRepository to aggregate.
     */
    where?: TemplateRepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositories to fetch.
     */
    orderBy?: TemplateRepositoryOrderByWithRelationInput | TemplateRepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TemplateRepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TemplateRepositories
    **/
    _count?: true | TemplateRepositoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TemplateRepositoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TemplateRepositoryMaxAggregateInputType
  }

  export type GetTemplateRepositoryAggregateType<T extends TemplateRepositoryAggregateArgs> = {
        [P in keyof T & keyof AggregateTemplateRepository]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTemplateRepository[P]>
      : GetScalarType<T[P], AggregateTemplateRepository[P]>
  }




  export type TemplateRepositoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateRepositoryWhereInput
    orderBy?: TemplateRepositoryOrderByWithAggregationInput | TemplateRepositoryOrderByWithAggregationInput[]
    by: TemplateRepositoryScalarFieldEnum[] | TemplateRepositoryScalarFieldEnum
    having?: TemplateRepositoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TemplateRepositoryCountAggregateInputType | true
    _min?: TemplateRepositoryMinAggregateInputType
    _max?: TemplateRepositoryMaxAggregateInputType
  }

  export type TemplateRepositoryGroupByOutputType = {
    uid: string
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    name: string
    description: string | null
    kind: $Enums.TemplateRepositoryKind
    organizationUid: string
    isPublic: boolean
    iconId: string | null
    isDeleted: boolean | null
    _count: TemplateRepositoryCountAggregateOutputType | null
    _min: TemplateRepositoryMinAggregateOutputType | null
    _max: TemplateRepositoryMaxAggregateOutputType | null
  }

  type GetTemplateRepositoryGroupByPayload<T extends TemplateRepositoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TemplateRepositoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TemplateRepositoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TemplateRepositoryGroupByOutputType[P]>
            : GetScalarType<T[P], TemplateRepositoryGroupByOutputType[P]>
        }
      >
    >


  export type TemplateRepositorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    uid?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    name?: boolean
    description?: boolean
    kind?: boolean
    organizationUid?: boolean
    isPublic?: boolean
    iconId?: boolean
    isDeleted?: boolean
    templates?: boolean | TemplateRepository$templatesArgs<ExtArgs>
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    templateRepositoryTags?: boolean | TemplateRepository$templateRepositoryTagsArgs<ExtArgs>
    _count?: boolean | TemplateRepositoryCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["templateRepository"]>

  export type TemplateRepositorySelectScalar = {
    uid?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    name?: boolean
    description?: boolean
    kind?: boolean
    organizationUid?: boolean
    isPublic?: boolean
    iconId?: boolean
    isDeleted?: boolean
  }

  export type TemplateRepositoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    templates?: boolean | TemplateRepository$templatesArgs<ExtArgs>
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
    templateRepositoryTags?: boolean | TemplateRepository$templateRepositoryTagsArgs<ExtArgs>
    _count?: boolean | TemplateRepositoryCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $TemplateRepositoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TemplateRepository"
    objects: {
      templates: Prisma.$TemplatePayload<ExtArgs>[]
      organization: Prisma.$OrganizationPayload<ExtArgs>
      templateRepositoryTags: Prisma.$TemplateRepositoryTagPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      uid: string
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
      name: string
      description: string | null
      kind: $Enums.TemplateRepositoryKind
      organizationUid: string
      isPublic: boolean
      iconId: string | null
      isDeleted: boolean | null
    }, ExtArgs["result"]["templateRepository"]>
    composites: {}
  }


  type TemplateRepositoryGetPayload<S extends boolean | null | undefined | TemplateRepositoryDefaultArgs> = $Result.GetResult<Prisma.$TemplateRepositoryPayload, S>

  type TemplateRepositoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TemplateRepositoryFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TemplateRepositoryCountAggregateInputType | true
    }

  export interface TemplateRepositoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TemplateRepository'], meta: { name: 'TemplateRepository' } }
    /**
     * Find zero or one TemplateRepository that matches the filter.
     * @param {TemplateRepositoryFindUniqueArgs} args - Arguments to find a TemplateRepository
     * @example
     * // Get one TemplateRepository
     * const templateRepository = await prisma.templateRepository.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends TemplateRepositoryFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryFindUniqueArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one TemplateRepository that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {TemplateRepositoryFindUniqueOrThrowArgs} args - Arguments to find a TemplateRepository
     * @example
     * // Get one TemplateRepository
     * const templateRepository = await prisma.templateRepository.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends TemplateRepositoryFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first TemplateRepository that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryFindFirstArgs} args - Arguments to find a TemplateRepository
     * @example
     * // Get one TemplateRepository
     * const templateRepository = await prisma.templateRepository.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends TemplateRepositoryFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryFindFirstArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first TemplateRepository that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryFindFirstOrThrowArgs} args - Arguments to find a TemplateRepository
     * @example
     * // Get one TemplateRepository
     * const templateRepository = await prisma.templateRepository.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends TemplateRepositoryFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more TemplateRepositories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TemplateRepositories
     * const templateRepositories = await prisma.templateRepository.findMany()
     * 
     * // Get first 10 TemplateRepositories
     * const templateRepositories = await prisma.templateRepository.findMany({ take: 10 })
     * 
     * // Only select the `uid`
     * const templateRepositoryWithUidOnly = await prisma.templateRepository.findMany({ select: { uid: true } })
     * 
    **/
    findMany<T extends TemplateRepositoryFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a TemplateRepository.
     * @param {TemplateRepositoryCreateArgs} args - Arguments to create a TemplateRepository.
     * @example
     * // Create one TemplateRepository
     * const TemplateRepository = await prisma.templateRepository.create({
     *   data: {
     *     // ... data to create a TemplateRepository
     *   }
     * })
     * 
    **/
    create<T extends TemplateRepositoryCreateArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryCreateArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many TemplateRepositories.
     *     @param {TemplateRepositoryCreateManyArgs} args - Arguments to create many TemplateRepositories.
     *     @example
     *     // Create many TemplateRepositories
     *     const templateRepository = await prisma.templateRepository.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends TemplateRepositoryCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a TemplateRepository.
     * @param {TemplateRepositoryDeleteArgs} args - Arguments to delete one TemplateRepository.
     * @example
     * // Delete one TemplateRepository
     * const TemplateRepository = await prisma.templateRepository.delete({
     *   where: {
     *     // ... filter to delete one TemplateRepository
     *   }
     * })
     * 
    **/
    delete<T extends TemplateRepositoryDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryDeleteArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one TemplateRepository.
     * @param {TemplateRepositoryUpdateArgs} args - Arguments to update one TemplateRepository.
     * @example
     * // Update one TemplateRepository
     * const templateRepository = await prisma.templateRepository.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends TemplateRepositoryUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryUpdateArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more TemplateRepositories.
     * @param {TemplateRepositoryDeleteManyArgs} args - Arguments to filter TemplateRepositories to delete.
     * @example
     * // Delete a few TemplateRepositories
     * const { count } = await prisma.templateRepository.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends TemplateRepositoryDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TemplateRepositories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TemplateRepositories
     * const templateRepository = await prisma.templateRepository.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends TemplateRepositoryUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TemplateRepository.
     * @param {TemplateRepositoryUpsertArgs} args - Arguments to update or create a TemplateRepository.
     * @example
     * // Update or create a TemplateRepository
     * const templateRepository = await prisma.templateRepository.upsert({
     *   create: {
     *     // ... data to create a TemplateRepository
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TemplateRepository we want to update
     *   }
     * })
    **/
    upsert<T extends TemplateRepositoryUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryUpsertArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of TemplateRepositories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryCountArgs} args - Arguments to filter TemplateRepositories to count.
     * @example
     * // Count the number of TemplateRepositories
     * const count = await prisma.templateRepository.count({
     *   where: {
     *     // ... the filter for the TemplateRepositories we want to count
     *   }
     * })
    **/
    count<T extends TemplateRepositoryCountArgs>(
      args?: Subset<T, TemplateRepositoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TemplateRepositoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TemplateRepository.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TemplateRepositoryAggregateArgs>(args: Subset<T, TemplateRepositoryAggregateArgs>): Prisma.PrismaPromise<GetTemplateRepositoryAggregateType<T>>

    /**
     * Group by TemplateRepository.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TemplateRepositoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TemplateRepositoryGroupByArgs['orderBy'] }
        : { orderBy?: TemplateRepositoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TemplateRepositoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTemplateRepositoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TemplateRepository model
   */
  readonly fields: TemplateRepositoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TemplateRepository.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TemplateRepositoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    templates<T extends TemplateRepository$templatesArgs<ExtArgs> = {}>(args?: Subset<T, TemplateRepository$templatesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findMany'> | Null>;

    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    templateRepositoryTags<T extends TemplateRepository$templateRepositoryTagsArgs<ExtArgs> = {}>(args?: Subset<T, TemplateRepository$templateRepositoryTagsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the TemplateRepository model
   */ 
  interface TemplateRepositoryFieldRefs {
    readonly uid: FieldRef<"TemplateRepository", 'String'>
    readonly deletedAt: FieldRef<"TemplateRepository", 'DateTime'>
    readonly createdAt: FieldRef<"TemplateRepository", 'DateTime'>
    readonly updatedAt: FieldRef<"TemplateRepository", 'DateTime'>
    readonly name: FieldRef<"TemplateRepository", 'String'>
    readonly description: FieldRef<"TemplateRepository", 'String'>
    readonly kind: FieldRef<"TemplateRepository", 'TemplateRepositoryKind'>
    readonly organizationUid: FieldRef<"TemplateRepository", 'String'>
    readonly isPublic: FieldRef<"TemplateRepository", 'Boolean'>
    readonly iconId: FieldRef<"TemplateRepository", 'String'>
    readonly isDeleted: FieldRef<"TemplateRepository", 'Boolean'>
  }
    

  // Custom InputTypes

  /**
   * TemplateRepository findUnique
   */
  export type TemplateRepositoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepository to fetch.
     */
    where: TemplateRepositoryWhereUniqueInput
  }


  /**
   * TemplateRepository findUniqueOrThrow
   */
  export type TemplateRepositoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepository to fetch.
     */
    where: TemplateRepositoryWhereUniqueInput
  }


  /**
   * TemplateRepository findFirst
   */
  export type TemplateRepositoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepository to fetch.
     */
    where?: TemplateRepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositories to fetch.
     */
    orderBy?: TemplateRepositoryOrderByWithRelationInput | TemplateRepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TemplateRepositories.
     */
    cursor?: TemplateRepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TemplateRepositories.
     */
    distinct?: TemplateRepositoryScalarFieldEnum | TemplateRepositoryScalarFieldEnum[]
  }


  /**
   * TemplateRepository findFirstOrThrow
   */
  export type TemplateRepositoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepository to fetch.
     */
    where?: TemplateRepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositories to fetch.
     */
    orderBy?: TemplateRepositoryOrderByWithRelationInput | TemplateRepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TemplateRepositories.
     */
    cursor?: TemplateRepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TemplateRepositories.
     */
    distinct?: TemplateRepositoryScalarFieldEnum | TemplateRepositoryScalarFieldEnum[]
  }


  /**
   * TemplateRepository findMany
   */
  export type TemplateRepositoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepositories to fetch.
     */
    where?: TemplateRepositoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositories to fetch.
     */
    orderBy?: TemplateRepositoryOrderByWithRelationInput | TemplateRepositoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TemplateRepositories.
     */
    cursor?: TemplateRepositoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositories.
     */
    skip?: number
    distinct?: TemplateRepositoryScalarFieldEnum | TemplateRepositoryScalarFieldEnum[]
  }


  /**
   * TemplateRepository create
   */
  export type TemplateRepositoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * The data needed to create a TemplateRepository.
     */
    data: XOR<TemplateRepositoryCreateInput, TemplateRepositoryUncheckedCreateInput>
  }


  /**
   * TemplateRepository createMany
   */
  export type TemplateRepositoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TemplateRepositories.
     */
    data: TemplateRepositoryCreateManyInput | TemplateRepositoryCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * TemplateRepository update
   */
  export type TemplateRepositoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * The data needed to update a TemplateRepository.
     */
    data: XOR<TemplateRepositoryUpdateInput, TemplateRepositoryUncheckedUpdateInput>
    /**
     * Choose, which TemplateRepository to update.
     */
    where: TemplateRepositoryWhereUniqueInput
  }


  /**
   * TemplateRepository updateMany
   */
  export type TemplateRepositoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TemplateRepositories.
     */
    data: XOR<TemplateRepositoryUpdateManyMutationInput, TemplateRepositoryUncheckedUpdateManyInput>
    /**
     * Filter which TemplateRepositories to update
     */
    where?: TemplateRepositoryWhereInput
  }


  /**
   * TemplateRepository upsert
   */
  export type TemplateRepositoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * The filter to search for the TemplateRepository to update in case it exists.
     */
    where: TemplateRepositoryWhereUniqueInput
    /**
     * In case the TemplateRepository found by the `where` argument doesn't exist, create a new TemplateRepository with this data.
     */
    create: XOR<TemplateRepositoryCreateInput, TemplateRepositoryUncheckedCreateInput>
    /**
     * In case the TemplateRepository was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TemplateRepositoryUpdateInput, TemplateRepositoryUncheckedUpdateInput>
  }


  /**
   * TemplateRepository delete
   */
  export type TemplateRepositoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
    /**
     * Filter which TemplateRepository to delete.
     */
    where: TemplateRepositoryWhereUniqueInput
  }


  /**
   * TemplateRepository deleteMany
   */
  export type TemplateRepositoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TemplateRepositories to delete
     */
    where?: TemplateRepositoryWhereInput
  }


  /**
   * TemplateRepository.templates
   */
  export type TemplateRepository$templatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    where?: TemplateWhereInput
    orderBy?: TemplateOrderByWithRelationInput | TemplateOrderByWithRelationInput[]
    cursor?: TemplateWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TemplateScalarFieldEnum | TemplateScalarFieldEnum[]
  }


  /**
   * TemplateRepository.templateRepositoryTags
   */
  export type TemplateRepository$templateRepositoryTagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    where?: TemplateRepositoryTagWhereInput
    orderBy?: TemplateRepositoryTagOrderByWithRelationInput | TemplateRepositoryTagOrderByWithRelationInput[]
    cursor?: TemplateRepositoryTagWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TemplateRepositoryTagScalarFieldEnum | TemplateRepositoryTagScalarFieldEnum[]
  }


  /**
   * TemplateRepository without action
   */
  export type TemplateRepositoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepository
     */
    select?: TemplateRepositorySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryInclude<ExtArgs> | null
  }



  /**
   * Model Template
   */

  export type AggregateTemplate = {
    _count: TemplateCountAggregateOutputType | null
    _min: TemplateMinAggregateOutputType | null
    _max: TemplateMaxAggregateOutputType | null
  }

  export type TemplateMinAggregateOutputType = {
    uid: string | null
    name: string | null
    templateRepositoryUid: string | null
    devboxReleaseImage: string | null
    image: string | null
    config: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    parentUid: string | null
    isDeleted: boolean | null
  }

  export type TemplateMaxAggregateOutputType = {
    uid: string | null
    name: string | null
    templateRepositoryUid: string | null
    devboxReleaseImage: string | null
    image: string | null
    config: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    parentUid: string | null
    isDeleted: boolean | null
  }

  export type TemplateCountAggregateOutputType = {
    uid: number
    name: number
    templateRepositoryUid: number
    devboxReleaseImage: number
    image: number
    config: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    parentUid: number
    isDeleted: number
    _all: number
  }


  export type TemplateMinAggregateInputType = {
    uid?: true
    name?: true
    templateRepositoryUid?: true
    devboxReleaseImage?: true
    image?: true
    config?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    parentUid?: true
    isDeleted?: true
  }

  export type TemplateMaxAggregateInputType = {
    uid?: true
    name?: true
    templateRepositoryUid?: true
    devboxReleaseImage?: true
    image?: true
    config?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    parentUid?: true
    isDeleted?: true
  }

  export type TemplateCountAggregateInputType = {
    uid?: true
    name?: true
    templateRepositoryUid?: true
    devboxReleaseImage?: true
    image?: true
    config?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    parentUid?: true
    isDeleted?: true
    _all?: true
  }

  export type TemplateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Template to aggregate.
     */
    where?: TemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Templates to fetch.
     */
    orderBy?: TemplateOrderByWithRelationInput | TemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Templates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Templates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Templates
    **/
    _count?: true | TemplateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TemplateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TemplateMaxAggregateInputType
  }

  export type GetTemplateAggregateType<T extends TemplateAggregateArgs> = {
        [P in keyof T & keyof AggregateTemplate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTemplate[P]>
      : GetScalarType<T[P], AggregateTemplate[P]>
  }




  export type TemplateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateWhereInput
    orderBy?: TemplateOrderByWithAggregationInput | TemplateOrderByWithAggregationInput[]
    by: TemplateScalarFieldEnum[] | TemplateScalarFieldEnum
    having?: TemplateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TemplateCountAggregateInputType | true
    _min?: TemplateMinAggregateInputType
    _max?: TemplateMaxAggregateInputType
  }

  export type TemplateGroupByOutputType = {
    uid: string
    name: string
    templateRepositoryUid: string
    devboxReleaseImage: string | null
    image: string
    config: string
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    parentUid: string | null
    isDeleted: boolean | null
    _count: TemplateCountAggregateOutputType | null
    _min: TemplateMinAggregateOutputType | null
    _max: TemplateMaxAggregateOutputType | null
  }

  type GetTemplateGroupByPayload<T extends TemplateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TemplateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TemplateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TemplateGroupByOutputType[P]>
            : GetScalarType<T[P], TemplateGroupByOutputType[P]>
        }
      >
    >


  export type TemplateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    uid?: boolean
    name?: boolean
    templateRepositoryUid?: boolean
    devboxReleaseImage?: boolean
    image?: boolean
    config?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    parentUid?: boolean
    isDeleted?: boolean
    parent?: boolean | Template$parentArgs<ExtArgs>
    children?: boolean | Template$childrenArgs<ExtArgs>
    templateRepository?: boolean | TemplateRepositoryDefaultArgs<ExtArgs>
    _count?: boolean | TemplateCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["template"]>

  export type TemplateSelectScalar = {
    uid?: boolean
    name?: boolean
    templateRepositoryUid?: boolean
    devboxReleaseImage?: boolean
    image?: boolean
    config?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    parentUid?: boolean
    isDeleted?: boolean
  }

  export type TemplateInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    parent?: boolean | Template$parentArgs<ExtArgs>
    children?: boolean | Template$childrenArgs<ExtArgs>
    templateRepository?: boolean | TemplateRepositoryDefaultArgs<ExtArgs>
    _count?: boolean | TemplateCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $TemplatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Template"
    objects: {
      parent: Prisma.$TemplatePayload<ExtArgs> | null
      children: Prisma.$TemplatePayload<ExtArgs>[]
      templateRepository: Prisma.$TemplateRepositoryPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      uid: string
      name: string
      templateRepositoryUid: string
      devboxReleaseImage: string | null
      image: string
      config: string
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
      parentUid: string | null
      isDeleted: boolean | null
    }, ExtArgs["result"]["template"]>
    composites: {}
  }


  type TemplateGetPayload<S extends boolean | null | undefined | TemplateDefaultArgs> = $Result.GetResult<Prisma.$TemplatePayload, S>

  type TemplateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TemplateFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TemplateCountAggregateInputType | true
    }

  export interface TemplateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Template'], meta: { name: 'Template' } }
    /**
     * Find zero or one Template that matches the filter.
     * @param {TemplateFindUniqueArgs} args - Arguments to find a Template
     * @example
     * // Get one Template
     * const template = await prisma.template.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends TemplateFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateFindUniqueArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Template that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {TemplateFindUniqueOrThrowArgs} args - Arguments to find a Template
     * @example
     * // Get one Template
     * const template = await prisma.template.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends TemplateFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Template that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateFindFirstArgs} args - Arguments to find a Template
     * @example
     * // Get one Template
     * const template = await prisma.template.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends TemplateFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateFindFirstArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Template that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateFindFirstOrThrowArgs} args - Arguments to find a Template
     * @example
     * // Get one Template
     * const template = await prisma.template.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends TemplateFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Templates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Templates
     * const templates = await prisma.template.findMany()
     * 
     * // Get first 10 Templates
     * const templates = await prisma.template.findMany({ take: 10 })
     * 
     * // Only select the `uid`
     * const templateWithUidOnly = await prisma.template.findMany({ select: { uid: true } })
     * 
    **/
    findMany<T extends TemplateFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Template.
     * @param {TemplateCreateArgs} args - Arguments to create a Template.
     * @example
     * // Create one Template
     * const Template = await prisma.template.create({
     *   data: {
     *     // ... data to create a Template
     *   }
     * })
     * 
    **/
    create<T extends TemplateCreateArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateCreateArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Templates.
     *     @param {TemplateCreateManyArgs} args - Arguments to create many Templates.
     *     @example
     *     // Create many Templates
     *     const template = await prisma.template.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends TemplateCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Template.
     * @param {TemplateDeleteArgs} args - Arguments to delete one Template.
     * @example
     * // Delete one Template
     * const Template = await prisma.template.delete({
     *   where: {
     *     // ... filter to delete one Template
     *   }
     * })
     * 
    **/
    delete<T extends TemplateDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateDeleteArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Template.
     * @param {TemplateUpdateArgs} args - Arguments to update one Template.
     * @example
     * // Update one Template
     * const template = await prisma.template.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends TemplateUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateUpdateArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Templates.
     * @param {TemplateDeleteManyArgs} args - Arguments to filter Templates to delete.
     * @example
     * // Delete a few Templates
     * const { count } = await prisma.template.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends TemplateDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Templates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Templates
     * const template = await prisma.template.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends TemplateUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Template.
     * @param {TemplateUpsertArgs} args - Arguments to update or create a Template.
     * @example
     * // Update or create a Template
     * const template = await prisma.template.upsert({
     *   create: {
     *     // ... data to create a Template
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Template we want to update
     *   }
     * })
    **/
    upsert<T extends TemplateUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateUpsertArgs<ExtArgs>>
    ): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Templates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateCountArgs} args - Arguments to filter Templates to count.
     * @example
     * // Count the number of Templates
     * const count = await prisma.template.count({
     *   where: {
     *     // ... the filter for the Templates we want to count
     *   }
     * })
    **/
    count<T extends TemplateCountArgs>(
      args?: Subset<T, TemplateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TemplateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Template.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TemplateAggregateArgs>(args: Subset<T, TemplateAggregateArgs>): Prisma.PrismaPromise<GetTemplateAggregateType<T>>

    /**
     * Group by Template.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TemplateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TemplateGroupByArgs['orderBy'] }
        : { orderBy?: TemplateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TemplateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTemplateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Template model
   */
  readonly fields: TemplateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Template.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TemplateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    parent<T extends Template$parentArgs<ExtArgs> = {}>(args?: Subset<T, Template$parentArgs<ExtArgs>>): Prisma__TemplateClient<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    children<T extends Template$childrenArgs<ExtArgs> = {}>(args?: Subset<T, Template$childrenArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplatePayload<ExtArgs>, T, 'findMany'> | Null>;

    templateRepository<T extends TemplateRepositoryDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TemplateRepositoryDefaultArgs<ExtArgs>>): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Template model
   */ 
  interface TemplateFieldRefs {
    readonly uid: FieldRef<"Template", 'String'>
    readonly name: FieldRef<"Template", 'String'>
    readonly templateRepositoryUid: FieldRef<"Template", 'String'>
    readonly devboxReleaseImage: FieldRef<"Template", 'String'>
    readonly image: FieldRef<"Template", 'String'>
    readonly config: FieldRef<"Template", 'String'>
    readonly deletedAt: FieldRef<"Template", 'DateTime'>
    readonly createdAt: FieldRef<"Template", 'DateTime'>
    readonly updatedAt: FieldRef<"Template", 'DateTime'>
    readonly parentUid: FieldRef<"Template", 'String'>
    readonly isDeleted: FieldRef<"Template", 'Boolean'>
  }
    

  // Custom InputTypes

  /**
   * Template findUnique
   */
  export type TemplateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * Filter, which Template to fetch.
     */
    where: TemplateWhereUniqueInput
  }


  /**
   * Template findUniqueOrThrow
   */
  export type TemplateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * Filter, which Template to fetch.
     */
    where: TemplateWhereUniqueInput
  }


  /**
   * Template findFirst
   */
  export type TemplateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * Filter, which Template to fetch.
     */
    where?: TemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Templates to fetch.
     */
    orderBy?: TemplateOrderByWithRelationInput | TemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Templates.
     */
    cursor?: TemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Templates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Templates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Templates.
     */
    distinct?: TemplateScalarFieldEnum | TemplateScalarFieldEnum[]
  }


  /**
   * Template findFirstOrThrow
   */
  export type TemplateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * Filter, which Template to fetch.
     */
    where?: TemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Templates to fetch.
     */
    orderBy?: TemplateOrderByWithRelationInput | TemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Templates.
     */
    cursor?: TemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Templates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Templates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Templates.
     */
    distinct?: TemplateScalarFieldEnum | TemplateScalarFieldEnum[]
  }


  /**
   * Template findMany
   */
  export type TemplateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * Filter, which Templates to fetch.
     */
    where?: TemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Templates to fetch.
     */
    orderBy?: TemplateOrderByWithRelationInput | TemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Templates.
     */
    cursor?: TemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Templates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Templates.
     */
    skip?: number
    distinct?: TemplateScalarFieldEnum | TemplateScalarFieldEnum[]
  }


  /**
   * Template create
   */
  export type TemplateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * The data needed to create a Template.
     */
    data: XOR<TemplateCreateInput, TemplateUncheckedCreateInput>
  }


  /**
   * Template createMany
   */
  export type TemplateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Templates.
     */
    data: TemplateCreateManyInput | TemplateCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * Template update
   */
  export type TemplateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * The data needed to update a Template.
     */
    data: XOR<TemplateUpdateInput, TemplateUncheckedUpdateInput>
    /**
     * Choose, which Template to update.
     */
    where: TemplateWhereUniqueInput
  }


  /**
   * Template updateMany
   */
  export type TemplateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Templates.
     */
    data: XOR<TemplateUpdateManyMutationInput, TemplateUncheckedUpdateManyInput>
    /**
     * Filter which Templates to update
     */
    where?: TemplateWhereInput
  }


  /**
   * Template upsert
   */
  export type TemplateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * The filter to search for the Template to update in case it exists.
     */
    where: TemplateWhereUniqueInput
    /**
     * In case the Template found by the `where` argument doesn't exist, create a new Template with this data.
     */
    create: XOR<TemplateCreateInput, TemplateUncheckedCreateInput>
    /**
     * In case the Template was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TemplateUpdateInput, TemplateUncheckedUpdateInput>
  }


  /**
   * Template delete
   */
  export type TemplateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    /**
     * Filter which Template to delete.
     */
    where: TemplateWhereUniqueInput
  }


  /**
   * Template deleteMany
   */
  export type TemplateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Templates to delete
     */
    where?: TemplateWhereInput
  }


  /**
   * Template.parent
   */
  export type Template$parentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    where?: TemplateWhereInput
  }


  /**
   * Template.children
   */
  export type Template$childrenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
    where?: TemplateWhereInput
    orderBy?: TemplateOrderByWithRelationInput | TemplateOrderByWithRelationInput[]
    cursor?: TemplateWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TemplateScalarFieldEnum | TemplateScalarFieldEnum[]
  }


  /**
   * Template without action
   */
  export type TemplateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Template
     */
    select?: TemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateInclude<ExtArgs> | null
  }



  /**
   * Model Tag
   */

  export type AggregateTag = {
    _count: TagCountAggregateOutputType | null
    _min: TagMinAggregateOutputType | null
    _max: TagMaxAggregateOutputType | null
  }

  export type TagMinAggregateOutputType = {
    uid: string | null
    name: string | null
    zhName: string | null
    enName: string | null
  }

  export type TagMaxAggregateOutputType = {
    uid: string | null
    name: string | null
    zhName: string | null
    enName: string | null
  }

  export type TagCountAggregateOutputType = {
    uid: number
    name: number
    zhName: number
    enName: number
    _all: number
  }


  export type TagMinAggregateInputType = {
    uid?: true
    name?: true
    zhName?: true
    enName?: true
  }

  export type TagMaxAggregateInputType = {
    uid?: true
    name?: true
    zhName?: true
    enName?: true
  }

  export type TagCountAggregateInputType = {
    uid?: true
    name?: true
    zhName?: true
    enName?: true
    _all?: true
  }

  export type TagAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tag to aggregate.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tags
    **/
    _count?: true | TagCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TagMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TagMaxAggregateInputType
  }

  export type GetTagAggregateType<T extends TagAggregateArgs> = {
        [P in keyof T & keyof AggregateTag]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTag[P]>
      : GetScalarType<T[P], AggregateTag[P]>
  }




  export type TagGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TagWhereInput
    orderBy?: TagOrderByWithAggregationInput | TagOrderByWithAggregationInput[]
    by: TagScalarFieldEnum[] | TagScalarFieldEnum
    having?: TagScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TagCountAggregateInputType | true
    _min?: TagMinAggregateInputType
    _max?: TagMaxAggregateInputType
  }

  export type TagGroupByOutputType = {
    uid: string
    name: string
    zhName: string | null
    enName: string | null
    _count: TagCountAggregateOutputType | null
    _min: TagMinAggregateOutputType | null
    _max: TagMaxAggregateOutputType | null
  }

  type GetTagGroupByPayload<T extends TagGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TagGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TagGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TagGroupByOutputType[P]>
            : GetScalarType<T[P], TagGroupByOutputType[P]>
        }
      >
    >


  export type TagSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    uid?: boolean
    name?: boolean
    zhName?: boolean
    enName?: boolean
    templateRepositoryTags?: boolean | Tag$templateRepositoryTagsArgs<ExtArgs>
    _count?: boolean | TagCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tag"]>

  export type TagSelectScalar = {
    uid?: boolean
    name?: boolean
    zhName?: boolean
    enName?: boolean
  }

  export type TagInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    templateRepositoryTags?: boolean | Tag$templateRepositoryTagsArgs<ExtArgs>
    _count?: boolean | TagCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $TagPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Tag"
    objects: {
      templateRepositoryTags: Prisma.$TemplateRepositoryTagPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      uid: string
      name: string
      zhName: string | null
      enName: string | null
    }, ExtArgs["result"]["tag"]>
    composites: {}
  }


  type TagGetPayload<S extends boolean | null | undefined | TagDefaultArgs> = $Result.GetResult<Prisma.$TagPayload, S>

  type TagCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TagFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TagCountAggregateInputType | true
    }

  export interface TagDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Tag'], meta: { name: 'Tag' } }
    /**
     * Find zero or one Tag that matches the filter.
     * @param {TagFindUniqueArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends TagFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, TagFindUniqueArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Tag that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {TagFindUniqueOrThrowArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends TagFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TagFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Tag that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagFindFirstArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends TagFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, TagFindFirstArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Tag that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagFindFirstOrThrowArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends TagFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TagFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Tags that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tags
     * const tags = await prisma.tag.findMany()
     * 
     * // Get first 10 Tags
     * const tags = await prisma.tag.findMany({ take: 10 })
     * 
     * // Only select the `uid`
     * const tagWithUidOnly = await prisma.tag.findMany({ select: { uid: true } })
     * 
    **/
    findMany<T extends TagFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TagFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Tag.
     * @param {TagCreateArgs} args - Arguments to create a Tag.
     * @example
     * // Create one Tag
     * const Tag = await prisma.tag.create({
     *   data: {
     *     // ... data to create a Tag
     *   }
     * })
     * 
    **/
    create<T extends TagCreateArgs<ExtArgs>>(
      args: SelectSubset<T, TagCreateArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Tags.
     *     @param {TagCreateManyArgs} args - Arguments to create many Tags.
     *     @example
     *     // Create many Tags
     *     const tag = await prisma.tag.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends TagCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TagCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Tag.
     * @param {TagDeleteArgs} args - Arguments to delete one Tag.
     * @example
     * // Delete one Tag
     * const Tag = await prisma.tag.delete({
     *   where: {
     *     // ... filter to delete one Tag
     *   }
     * })
     * 
    **/
    delete<T extends TagDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, TagDeleteArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Tag.
     * @param {TagUpdateArgs} args - Arguments to update one Tag.
     * @example
     * // Update one Tag
     * const tag = await prisma.tag.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends TagUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, TagUpdateArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Tags.
     * @param {TagDeleteManyArgs} args - Arguments to filter Tags to delete.
     * @example
     * // Delete a few Tags
     * const { count } = await prisma.tag.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends TagDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TagDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tags
     * const tag = await prisma.tag.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends TagUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, TagUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Tag.
     * @param {TagUpsertArgs} args - Arguments to update or create a Tag.
     * @example
     * // Update or create a Tag
     * const tag = await prisma.tag.upsert({
     *   create: {
     *     // ... data to create a Tag
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Tag we want to update
     *   }
     * })
    **/
    upsert<T extends TagUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, TagUpsertArgs<ExtArgs>>
    ): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Tags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagCountArgs} args - Arguments to filter Tags to count.
     * @example
     * // Count the number of Tags
     * const count = await prisma.tag.count({
     *   where: {
     *     // ... the filter for the Tags we want to count
     *   }
     * })
    **/
    count<T extends TagCountArgs>(
      args?: Subset<T, TagCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TagCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Tag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TagAggregateArgs>(args: Subset<T, TagAggregateArgs>): Prisma.PrismaPromise<GetTagAggregateType<T>>

    /**
     * Group by Tag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TagGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TagGroupByArgs['orderBy'] }
        : { orderBy?: TagGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TagGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTagGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Tag model
   */
  readonly fields: TagFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Tag.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TagClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    templateRepositoryTags<T extends Tag$templateRepositoryTagsArgs<ExtArgs> = {}>(args?: Subset<T, Tag$templateRepositoryTagsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Tag model
   */ 
  interface TagFieldRefs {
    readonly uid: FieldRef<"Tag", 'String'>
    readonly name: FieldRef<"Tag", 'String'>
    readonly zhName: FieldRef<"Tag", 'String'>
    readonly enName: FieldRef<"Tag", 'String'>
  }
    

  // Custom InputTypes

  /**
   * Tag findUnique
   */
  export type TagFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where: TagWhereUniqueInput
  }


  /**
   * Tag findUniqueOrThrow
   */
  export type TagFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where: TagWhereUniqueInput
  }


  /**
   * Tag findFirst
   */
  export type TagFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tags.
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tags.
     */
    distinct?: TagScalarFieldEnum | TagScalarFieldEnum[]
  }


  /**
   * Tag findFirstOrThrow
   */
  export type TagFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tags.
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tags.
     */
    distinct?: TagScalarFieldEnum | TagScalarFieldEnum[]
  }


  /**
   * Tag findMany
   */
  export type TagFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tags to fetch.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tags.
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    distinct?: TagScalarFieldEnum | TagScalarFieldEnum[]
  }


  /**
   * Tag create
   */
  export type TagCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * The data needed to create a Tag.
     */
    data: XOR<TagCreateInput, TagUncheckedCreateInput>
  }


  /**
   * Tag createMany
   */
  export type TagCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tags.
     */
    data: TagCreateManyInput | TagCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * Tag update
   */
  export type TagUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * The data needed to update a Tag.
     */
    data: XOR<TagUpdateInput, TagUncheckedUpdateInput>
    /**
     * Choose, which Tag to update.
     */
    where: TagWhereUniqueInput
  }


  /**
   * Tag updateMany
   */
  export type TagUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tags.
     */
    data: XOR<TagUpdateManyMutationInput, TagUncheckedUpdateManyInput>
    /**
     * Filter which Tags to update
     */
    where?: TagWhereInput
  }


  /**
   * Tag upsert
   */
  export type TagUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * The filter to search for the Tag to update in case it exists.
     */
    where: TagWhereUniqueInput
    /**
     * In case the Tag found by the `where` argument doesn't exist, create a new Tag with this data.
     */
    create: XOR<TagCreateInput, TagUncheckedCreateInput>
    /**
     * In case the Tag was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TagUpdateInput, TagUncheckedUpdateInput>
  }


  /**
   * Tag delete
   */
  export type TagDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter which Tag to delete.
     */
    where: TagWhereUniqueInput
  }


  /**
   * Tag deleteMany
   */
  export type TagDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tags to delete
     */
    where?: TagWhereInput
  }


  /**
   * Tag.templateRepositoryTags
   */
  export type Tag$templateRepositoryTagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    where?: TemplateRepositoryTagWhereInput
    orderBy?: TemplateRepositoryTagOrderByWithRelationInput | TemplateRepositoryTagOrderByWithRelationInput[]
    cursor?: TemplateRepositoryTagWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TemplateRepositoryTagScalarFieldEnum | TemplateRepositoryTagScalarFieldEnum[]
  }


  /**
   * Tag without action
   */
  export type TagDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TagInclude<ExtArgs> | null
  }



  /**
   * Model TemplateRepositoryTag
   */

  export type AggregateTemplateRepositoryTag = {
    _count: TemplateRepositoryTagCountAggregateOutputType | null
    _min: TemplateRepositoryTagMinAggregateOutputType | null
    _max: TemplateRepositoryTagMaxAggregateOutputType | null
  }

  export type TemplateRepositoryTagMinAggregateOutputType = {
    templateRepositoryUid: string | null
    tagUid: string | null
  }

  export type TemplateRepositoryTagMaxAggregateOutputType = {
    templateRepositoryUid: string | null
    tagUid: string | null
  }

  export type TemplateRepositoryTagCountAggregateOutputType = {
    templateRepositoryUid: number
    tagUid: number
    _all: number
  }


  export type TemplateRepositoryTagMinAggregateInputType = {
    templateRepositoryUid?: true
    tagUid?: true
  }

  export type TemplateRepositoryTagMaxAggregateInputType = {
    templateRepositoryUid?: true
    tagUid?: true
  }

  export type TemplateRepositoryTagCountAggregateInputType = {
    templateRepositoryUid?: true
    tagUid?: true
    _all?: true
  }

  export type TemplateRepositoryTagAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TemplateRepositoryTag to aggregate.
     */
    where?: TemplateRepositoryTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositoryTags to fetch.
     */
    orderBy?: TemplateRepositoryTagOrderByWithRelationInput | TemplateRepositoryTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TemplateRepositoryTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositoryTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositoryTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TemplateRepositoryTags
    **/
    _count?: true | TemplateRepositoryTagCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TemplateRepositoryTagMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TemplateRepositoryTagMaxAggregateInputType
  }

  export type GetTemplateRepositoryTagAggregateType<T extends TemplateRepositoryTagAggregateArgs> = {
        [P in keyof T & keyof AggregateTemplateRepositoryTag]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTemplateRepositoryTag[P]>
      : GetScalarType<T[P], AggregateTemplateRepositoryTag[P]>
  }




  export type TemplateRepositoryTagGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TemplateRepositoryTagWhereInput
    orderBy?: TemplateRepositoryTagOrderByWithAggregationInput | TemplateRepositoryTagOrderByWithAggregationInput[]
    by: TemplateRepositoryTagScalarFieldEnum[] | TemplateRepositoryTagScalarFieldEnum
    having?: TemplateRepositoryTagScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TemplateRepositoryTagCountAggregateInputType | true
    _min?: TemplateRepositoryTagMinAggregateInputType
    _max?: TemplateRepositoryTagMaxAggregateInputType
  }

  export type TemplateRepositoryTagGroupByOutputType = {
    templateRepositoryUid: string
    tagUid: string
    _count: TemplateRepositoryTagCountAggregateOutputType | null
    _min: TemplateRepositoryTagMinAggregateOutputType | null
    _max: TemplateRepositoryTagMaxAggregateOutputType | null
  }

  type GetTemplateRepositoryTagGroupByPayload<T extends TemplateRepositoryTagGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TemplateRepositoryTagGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TemplateRepositoryTagGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TemplateRepositoryTagGroupByOutputType[P]>
            : GetScalarType<T[P], TemplateRepositoryTagGroupByOutputType[P]>
        }
      >
    >


  export type TemplateRepositoryTagSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    templateRepositoryUid?: boolean
    tagUid?: boolean
    templateRepository?: boolean | TemplateRepositoryDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["templateRepositoryTag"]>

  export type TemplateRepositoryTagSelectScalar = {
    templateRepositoryUid?: boolean
    tagUid?: boolean
  }

  export type TemplateRepositoryTagInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    templateRepository?: boolean | TemplateRepositoryDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }


  export type $TemplateRepositoryTagPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TemplateRepositoryTag"
    objects: {
      templateRepository: Prisma.$TemplateRepositoryPayload<ExtArgs>
      tag: Prisma.$TagPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      templateRepositoryUid: string
      tagUid: string
    }, ExtArgs["result"]["templateRepositoryTag"]>
    composites: {}
  }


  type TemplateRepositoryTagGetPayload<S extends boolean | null | undefined | TemplateRepositoryTagDefaultArgs> = $Result.GetResult<Prisma.$TemplateRepositoryTagPayload, S>

  type TemplateRepositoryTagCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TemplateRepositoryTagFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TemplateRepositoryTagCountAggregateInputType | true
    }

  export interface TemplateRepositoryTagDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TemplateRepositoryTag'], meta: { name: 'TemplateRepositoryTag' } }
    /**
     * Find zero or one TemplateRepositoryTag that matches the filter.
     * @param {TemplateRepositoryTagFindUniqueArgs} args - Arguments to find a TemplateRepositoryTag
     * @example
     * // Get one TemplateRepositoryTag
     * const templateRepositoryTag = await prisma.templateRepositoryTag.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends TemplateRepositoryTagFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryTagFindUniqueArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one TemplateRepositoryTag that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {TemplateRepositoryTagFindUniqueOrThrowArgs} args - Arguments to find a TemplateRepositoryTag
     * @example
     * // Get one TemplateRepositoryTag
     * const templateRepositoryTag = await prisma.templateRepositoryTag.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends TemplateRepositoryTagFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryTagFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first TemplateRepositoryTag that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryTagFindFirstArgs} args - Arguments to find a TemplateRepositoryTag
     * @example
     * // Get one TemplateRepositoryTag
     * const templateRepositoryTag = await prisma.templateRepositoryTag.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends TemplateRepositoryTagFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryTagFindFirstArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first TemplateRepositoryTag that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryTagFindFirstOrThrowArgs} args - Arguments to find a TemplateRepositoryTag
     * @example
     * // Get one TemplateRepositoryTag
     * const templateRepositoryTag = await prisma.templateRepositoryTag.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends TemplateRepositoryTagFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryTagFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more TemplateRepositoryTags that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryTagFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TemplateRepositoryTags
     * const templateRepositoryTags = await prisma.templateRepositoryTag.findMany()
     * 
     * // Get first 10 TemplateRepositoryTags
     * const templateRepositoryTags = await prisma.templateRepositoryTag.findMany({ take: 10 })
     * 
     * // Only select the `templateRepositoryUid`
     * const templateRepositoryTagWithTemplateRepositoryUidOnly = await prisma.templateRepositoryTag.findMany({ select: { templateRepositoryUid: true } })
     * 
    **/
    findMany<T extends TemplateRepositoryTagFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryTagFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a TemplateRepositoryTag.
     * @param {TemplateRepositoryTagCreateArgs} args - Arguments to create a TemplateRepositoryTag.
     * @example
     * // Create one TemplateRepositoryTag
     * const TemplateRepositoryTag = await prisma.templateRepositoryTag.create({
     *   data: {
     *     // ... data to create a TemplateRepositoryTag
     *   }
     * })
     * 
    **/
    create<T extends TemplateRepositoryTagCreateArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryTagCreateArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many TemplateRepositoryTags.
     *     @param {TemplateRepositoryTagCreateManyArgs} args - Arguments to create many TemplateRepositoryTags.
     *     @example
     *     // Create many TemplateRepositoryTags
     *     const templateRepositoryTag = await prisma.templateRepositoryTag.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends TemplateRepositoryTagCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryTagCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a TemplateRepositoryTag.
     * @param {TemplateRepositoryTagDeleteArgs} args - Arguments to delete one TemplateRepositoryTag.
     * @example
     * // Delete one TemplateRepositoryTag
     * const TemplateRepositoryTag = await prisma.templateRepositoryTag.delete({
     *   where: {
     *     // ... filter to delete one TemplateRepositoryTag
     *   }
     * })
     * 
    **/
    delete<T extends TemplateRepositoryTagDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryTagDeleteArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one TemplateRepositoryTag.
     * @param {TemplateRepositoryTagUpdateArgs} args - Arguments to update one TemplateRepositoryTag.
     * @example
     * // Update one TemplateRepositoryTag
     * const templateRepositoryTag = await prisma.templateRepositoryTag.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends TemplateRepositoryTagUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryTagUpdateArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more TemplateRepositoryTags.
     * @param {TemplateRepositoryTagDeleteManyArgs} args - Arguments to filter TemplateRepositoryTags to delete.
     * @example
     * // Delete a few TemplateRepositoryTags
     * const { count } = await prisma.templateRepositoryTag.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends TemplateRepositoryTagDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, TemplateRepositoryTagDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TemplateRepositoryTags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryTagUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TemplateRepositoryTags
     * const templateRepositoryTag = await prisma.templateRepositoryTag.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends TemplateRepositoryTagUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryTagUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TemplateRepositoryTag.
     * @param {TemplateRepositoryTagUpsertArgs} args - Arguments to update or create a TemplateRepositoryTag.
     * @example
     * // Update or create a TemplateRepositoryTag
     * const templateRepositoryTag = await prisma.templateRepositoryTag.upsert({
     *   create: {
     *     // ... data to create a TemplateRepositoryTag
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TemplateRepositoryTag we want to update
     *   }
     * })
    **/
    upsert<T extends TemplateRepositoryTagUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, TemplateRepositoryTagUpsertArgs<ExtArgs>>
    ): Prisma__TemplateRepositoryTagClient<$Result.GetResult<Prisma.$TemplateRepositoryTagPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of TemplateRepositoryTags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryTagCountArgs} args - Arguments to filter TemplateRepositoryTags to count.
     * @example
     * // Count the number of TemplateRepositoryTags
     * const count = await prisma.templateRepositoryTag.count({
     *   where: {
     *     // ... the filter for the TemplateRepositoryTags we want to count
     *   }
     * })
    **/
    count<T extends TemplateRepositoryTagCountArgs>(
      args?: Subset<T, TemplateRepositoryTagCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TemplateRepositoryTagCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TemplateRepositoryTag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryTagAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TemplateRepositoryTagAggregateArgs>(args: Subset<T, TemplateRepositoryTagAggregateArgs>): Prisma.PrismaPromise<GetTemplateRepositoryTagAggregateType<T>>

    /**
     * Group by TemplateRepositoryTag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TemplateRepositoryTagGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TemplateRepositoryTagGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TemplateRepositoryTagGroupByArgs['orderBy'] }
        : { orderBy?: TemplateRepositoryTagGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TemplateRepositoryTagGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTemplateRepositoryTagGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TemplateRepositoryTag model
   */
  readonly fields: TemplateRepositoryTagFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TemplateRepositoryTag.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TemplateRepositoryTagClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    templateRepository<T extends TemplateRepositoryDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TemplateRepositoryDefaultArgs<ExtArgs>>): Prisma__TemplateRepositoryClient<$Result.GetResult<Prisma.$TemplateRepositoryPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    tag<T extends TagDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TagDefaultArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the TemplateRepositoryTag model
   */ 
  interface TemplateRepositoryTagFieldRefs {
    readonly templateRepositoryUid: FieldRef<"TemplateRepositoryTag", 'String'>
    readonly tagUid: FieldRef<"TemplateRepositoryTag", 'String'>
  }
    

  // Custom InputTypes

  /**
   * TemplateRepositoryTag findUnique
   */
  export type TemplateRepositoryTagFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepositoryTag to fetch.
     */
    where: TemplateRepositoryTagWhereUniqueInput
  }


  /**
   * TemplateRepositoryTag findUniqueOrThrow
   */
  export type TemplateRepositoryTagFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepositoryTag to fetch.
     */
    where: TemplateRepositoryTagWhereUniqueInput
  }


  /**
   * TemplateRepositoryTag findFirst
   */
  export type TemplateRepositoryTagFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepositoryTag to fetch.
     */
    where?: TemplateRepositoryTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositoryTags to fetch.
     */
    orderBy?: TemplateRepositoryTagOrderByWithRelationInput | TemplateRepositoryTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TemplateRepositoryTags.
     */
    cursor?: TemplateRepositoryTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositoryTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositoryTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TemplateRepositoryTags.
     */
    distinct?: TemplateRepositoryTagScalarFieldEnum | TemplateRepositoryTagScalarFieldEnum[]
  }


  /**
   * TemplateRepositoryTag findFirstOrThrow
   */
  export type TemplateRepositoryTagFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepositoryTag to fetch.
     */
    where?: TemplateRepositoryTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositoryTags to fetch.
     */
    orderBy?: TemplateRepositoryTagOrderByWithRelationInput | TemplateRepositoryTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TemplateRepositoryTags.
     */
    cursor?: TemplateRepositoryTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositoryTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositoryTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TemplateRepositoryTags.
     */
    distinct?: TemplateRepositoryTagScalarFieldEnum | TemplateRepositoryTagScalarFieldEnum[]
  }


  /**
   * TemplateRepositoryTag findMany
   */
  export type TemplateRepositoryTagFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * Filter, which TemplateRepositoryTags to fetch.
     */
    where?: TemplateRepositoryTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TemplateRepositoryTags to fetch.
     */
    orderBy?: TemplateRepositoryTagOrderByWithRelationInput | TemplateRepositoryTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TemplateRepositoryTags.
     */
    cursor?: TemplateRepositoryTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TemplateRepositoryTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TemplateRepositoryTags.
     */
    skip?: number
    distinct?: TemplateRepositoryTagScalarFieldEnum | TemplateRepositoryTagScalarFieldEnum[]
  }


  /**
   * TemplateRepositoryTag create
   */
  export type TemplateRepositoryTagCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * The data needed to create a TemplateRepositoryTag.
     */
    data: XOR<TemplateRepositoryTagCreateInput, TemplateRepositoryTagUncheckedCreateInput>
  }


  /**
   * TemplateRepositoryTag createMany
   */
  export type TemplateRepositoryTagCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TemplateRepositoryTags.
     */
    data: TemplateRepositoryTagCreateManyInput | TemplateRepositoryTagCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * TemplateRepositoryTag update
   */
  export type TemplateRepositoryTagUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * The data needed to update a TemplateRepositoryTag.
     */
    data: XOR<TemplateRepositoryTagUpdateInput, TemplateRepositoryTagUncheckedUpdateInput>
    /**
     * Choose, which TemplateRepositoryTag to update.
     */
    where: TemplateRepositoryTagWhereUniqueInput
  }


  /**
   * TemplateRepositoryTag updateMany
   */
  export type TemplateRepositoryTagUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TemplateRepositoryTags.
     */
    data: XOR<TemplateRepositoryTagUpdateManyMutationInput, TemplateRepositoryTagUncheckedUpdateManyInput>
    /**
     * Filter which TemplateRepositoryTags to update
     */
    where?: TemplateRepositoryTagWhereInput
  }


  /**
   * TemplateRepositoryTag upsert
   */
  export type TemplateRepositoryTagUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * The filter to search for the TemplateRepositoryTag to update in case it exists.
     */
    where: TemplateRepositoryTagWhereUniqueInput
    /**
     * In case the TemplateRepositoryTag found by the `where` argument doesn't exist, create a new TemplateRepositoryTag with this data.
     */
    create: XOR<TemplateRepositoryTagCreateInput, TemplateRepositoryTagUncheckedCreateInput>
    /**
     * In case the TemplateRepositoryTag was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TemplateRepositoryTagUpdateInput, TemplateRepositoryTagUncheckedUpdateInput>
  }


  /**
   * TemplateRepositoryTag delete
   */
  export type TemplateRepositoryTagDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
    /**
     * Filter which TemplateRepositoryTag to delete.
     */
    where: TemplateRepositoryTagWhereUniqueInput
  }


  /**
   * TemplateRepositoryTag deleteMany
   */
  export type TemplateRepositoryTagDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TemplateRepositoryTags to delete
     */
    where?: TemplateRepositoryTagWhereInput
  }


  /**
   * TemplateRepositoryTag without action
   */
  export type TemplateRepositoryTagDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TemplateRepositoryTag
     */
    select?: TemplateRepositoryTagSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: TemplateRepositoryTagInclude<ExtArgs> | null
  }



  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    uid: 'uid',
    regionUid: 'regionUid',
    namespaceId: 'namespaceId',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    isDeleted: 'isDeleted'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const OrganizationScalarFieldEnum: {
    uid: 'uid',
    id: 'id',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    isDeleted: 'isDeleted',
    name: 'name'
  };

  export type OrganizationScalarFieldEnum = (typeof OrganizationScalarFieldEnum)[keyof typeof OrganizationScalarFieldEnum]


  export const UserOrganizationScalarFieldEnum: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    userUid: 'userUid',
    organizationUid: 'organizationUid'
  };

  export type UserOrganizationScalarFieldEnum = (typeof UserOrganizationScalarFieldEnum)[keyof typeof UserOrganizationScalarFieldEnum]


  export const TemplateRepositoryScalarFieldEnum: {
    uid: 'uid',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    name: 'name',
    description: 'description',
    kind: 'kind',
    organizationUid: 'organizationUid',
    isPublic: 'isPublic',
    iconId: 'iconId',
    isDeleted: 'isDeleted'
  };

  export type TemplateRepositoryScalarFieldEnum = (typeof TemplateRepositoryScalarFieldEnum)[keyof typeof TemplateRepositoryScalarFieldEnum]


  export const TemplateScalarFieldEnum: {
    uid: 'uid',
    name: 'name',
    templateRepositoryUid: 'templateRepositoryUid',
    devboxReleaseImage: 'devboxReleaseImage',
    image: 'image',
    config: 'config',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    parentUid: 'parentUid',
    isDeleted: 'isDeleted'
  };

  export type TemplateScalarFieldEnum = (typeof TemplateScalarFieldEnum)[keyof typeof TemplateScalarFieldEnum]


  export const TagScalarFieldEnum: {
    uid: 'uid',
    name: 'name',
    zhName: 'zhName',
    enName: 'enName'
  };

  export type TagScalarFieldEnum = (typeof TagScalarFieldEnum)[keyof typeof TagScalarFieldEnum]


  export const TemplateRepositoryTagScalarFieldEnum: {
    templateRepositoryUid: 'templateRepositoryUid',
    tagUid: 'tagUid'
  };

  export type TemplateRepositoryTagScalarFieldEnum = (typeof TemplateRepositoryTagScalarFieldEnum)[keyof typeof TemplateRepositoryTagScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'TemplateRepositoryKind'
   */
  export type EnumTemplateRepositoryKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TemplateRepositoryKind'>
    


  /**
   * Reference to a field of type 'TemplateRepositoryKind[]'
   */
  export type ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TemplateRepositoryKind[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    uid?: UuidFilter<"User"> | string
    regionUid?: StringFilter<"User"> | string
    namespaceId?: StringFilter<"User"> | string
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    isDeleted?: BoolNullableFilter<"User"> | boolean | null
    userOrganizations?: UserOrganizationListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    uid?: SortOrder
    regionUid?: SortOrder
    namespaceId?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    isDeleted?: SortOrderInput | SortOrder
    userOrganizations?: UserOrganizationOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    uid?: string
    isDeleted_regionUid_namespaceId?: UserIsDeletedRegionUidNamespaceIdCompoundUniqueInput
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    regionUid?: StringFilter<"User"> | string
    namespaceId?: StringFilter<"User"> | string
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    isDeleted?: BoolNullableFilter<"User"> | boolean | null
    userOrganizations?: UserOrganizationListRelationFilter
  }, "uid" | "isDeleted_regionUid_namespaceId">

  export type UserOrderByWithAggregationInput = {
    uid?: SortOrder
    regionUid?: SortOrder
    namespaceId?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    isDeleted?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    uid?: UuidWithAggregatesFilter<"User"> | string
    regionUid?: StringWithAggregatesFilter<"User"> | string
    namespaceId?: StringWithAggregatesFilter<"User"> | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    isDeleted?: BoolNullableWithAggregatesFilter<"User"> | boolean | null
  }

  export type OrganizationWhereInput = {
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    uid?: UuidFilter<"Organization"> | string
    id?: StringFilter<"Organization"> | string
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Organization"> | Date | string | null
    isDeleted?: BoolNullableFilter<"Organization"> | boolean | null
    name?: StringFilter<"Organization"> | string
    userOrganizations?: UserOrganizationListRelationFilter
    templateRepositories?: TemplateRepositoryListRelationFilter
  }

  export type OrganizationOrderByWithRelationInput = {
    uid?: SortOrder
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    isDeleted?: SortOrderInput | SortOrder
    name?: SortOrder
    userOrganizations?: UserOrganizationOrderByRelationAggregateInput
    templateRepositories?: TemplateRepositoryOrderByRelationAggregateInput
  }

  export type OrganizationWhereUniqueInput = Prisma.AtLeast<{
    uid?: string
    id?: string
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Organization"> | Date | string | null
    isDeleted?: BoolNullableFilter<"Organization"> | boolean | null
    name?: StringFilter<"Organization"> | string
    userOrganizations?: UserOrganizationListRelationFilter
    templateRepositories?: TemplateRepositoryListRelationFilter
  }, "uid" | "id">

  export type OrganizationOrderByWithAggregationInput = {
    uid?: SortOrder
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    isDeleted?: SortOrderInput | SortOrder
    name?: SortOrder
    _count?: OrganizationCountOrderByAggregateInput
    _max?: OrganizationMaxOrderByAggregateInput
    _min?: OrganizationMinOrderByAggregateInput
  }

  export type OrganizationScalarWhereWithAggregatesInput = {
    AND?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    OR?: OrganizationScalarWhereWithAggregatesInput[]
    NOT?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    uid?: UuidWithAggregatesFilter<"Organization"> | string
    id?: StringWithAggregatesFilter<"Organization"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Organization"> | Date | string | null
    isDeleted?: BoolNullableWithAggregatesFilter<"Organization"> | boolean | null
    name?: StringWithAggregatesFilter<"Organization"> | string
  }

  export type UserOrganizationWhereInput = {
    AND?: UserOrganizationWhereInput | UserOrganizationWhereInput[]
    OR?: UserOrganizationWhereInput[]
    NOT?: UserOrganizationWhereInput | UserOrganizationWhereInput[]
    createdAt?: DateTimeFilter<"UserOrganization"> | Date | string
    updatedAt?: DateTimeFilter<"UserOrganization"> | Date | string
    userUid?: UuidFilter<"UserOrganization"> | string
    organizationUid?: UuidFilter<"UserOrganization"> | string
    organization?: XOR<OrganizationRelationFilter, OrganizationWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type UserOrganizationOrderByWithRelationInput = {
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userUid?: SortOrder
    organizationUid?: SortOrder
    organization?: OrganizationOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type UserOrganizationWhereUniqueInput = Prisma.AtLeast<{
    organizationUid_userUid?: UserOrganizationOrganizationUidUserUidCompoundUniqueInput
    AND?: UserOrganizationWhereInput | UserOrganizationWhereInput[]
    OR?: UserOrganizationWhereInput[]
    NOT?: UserOrganizationWhereInput | UserOrganizationWhereInput[]
    createdAt?: DateTimeFilter<"UserOrganization"> | Date | string
    updatedAt?: DateTimeFilter<"UserOrganization"> | Date | string
    userUid?: UuidFilter<"UserOrganization"> | string
    organizationUid?: UuidFilter<"UserOrganization"> | string
    organization?: XOR<OrganizationRelationFilter, OrganizationWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "organizationUid_userUid">

  export type UserOrganizationOrderByWithAggregationInput = {
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userUid?: SortOrder
    organizationUid?: SortOrder
    _count?: UserOrganizationCountOrderByAggregateInput
    _max?: UserOrganizationMaxOrderByAggregateInput
    _min?: UserOrganizationMinOrderByAggregateInput
  }

  export type UserOrganizationScalarWhereWithAggregatesInput = {
    AND?: UserOrganizationScalarWhereWithAggregatesInput | UserOrganizationScalarWhereWithAggregatesInput[]
    OR?: UserOrganizationScalarWhereWithAggregatesInput[]
    NOT?: UserOrganizationScalarWhereWithAggregatesInput | UserOrganizationScalarWhereWithAggregatesInput[]
    createdAt?: DateTimeWithAggregatesFilter<"UserOrganization"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UserOrganization"> | Date | string
    userUid?: UuidWithAggregatesFilter<"UserOrganization"> | string
    organizationUid?: UuidWithAggregatesFilter<"UserOrganization"> | string
  }

  export type TemplateRepositoryWhereInput = {
    AND?: TemplateRepositoryWhereInput | TemplateRepositoryWhereInput[]
    OR?: TemplateRepositoryWhereInput[]
    NOT?: TemplateRepositoryWhereInput | TemplateRepositoryWhereInput[]
    uid?: UuidFilter<"TemplateRepository"> | string
    deletedAt?: DateTimeNullableFilter<"TemplateRepository"> | Date | string | null
    createdAt?: DateTimeFilter<"TemplateRepository"> | Date | string
    updatedAt?: DateTimeFilter<"TemplateRepository"> | Date | string
    name?: StringFilter<"TemplateRepository"> | string
    description?: StringNullableFilter<"TemplateRepository"> | string | null
    kind?: EnumTemplateRepositoryKindFilter<"TemplateRepository"> | $Enums.TemplateRepositoryKind
    organizationUid?: StringFilter<"TemplateRepository"> | string
    isPublic?: BoolFilter<"TemplateRepository"> | boolean
    iconId?: StringNullableFilter<"TemplateRepository"> | string | null
    isDeleted?: BoolNullableFilter<"TemplateRepository"> | boolean | null
    templates?: TemplateListRelationFilter
    organization?: XOR<OrganizationRelationFilter, OrganizationWhereInput>
    templateRepositoryTags?: TemplateRepositoryTagListRelationFilter
  }

  export type TemplateRepositoryOrderByWithRelationInput = {
    uid?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    kind?: SortOrder
    organizationUid?: SortOrder
    isPublic?: SortOrder
    iconId?: SortOrderInput | SortOrder
    isDeleted?: SortOrderInput | SortOrder
    templates?: TemplateOrderByRelationAggregateInput
    organization?: OrganizationOrderByWithRelationInput
    templateRepositoryTags?: TemplateRepositoryTagOrderByRelationAggregateInput
  }

  export type TemplateRepositoryWhereUniqueInput = Prisma.AtLeast<{
    uid?: string
    isDeleted_name?: TemplateRepositoryIsDeletedNameCompoundUniqueInput
    AND?: TemplateRepositoryWhereInput | TemplateRepositoryWhereInput[]
    OR?: TemplateRepositoryWhereInput[]
    NOT?: TemplateRepositoryWhereInput | TemplateRepositoryWhereInput[]
    deletedAt?: DateTimeNullableFilter<"TemplateRepository"> | Date | string | null
    createdAt?: DateTimeFilter<"TemplateRepository"> | Date | string
    updatedAt?: DateTimeFilter<"TemplateRepository"> | Date | string
    name?: StringFilter<"TemplateRepository"> | string
    description?: StringNullableFilter<"TemplateRepository"> | string | null
    kind?: EnumTemplateRepositoryKindFilter<"TemplateRepository"> | $Enums.TemplateRepositoryKind
    organizationUid?: StringFilter<"TemplateRepository"> | string
    isPublic?: BoolFilter<"TemplateRepository"> | boolean
    iconId?: StringNullableFilter<"TemplateRepository"> | string | null
    isDeleted?: BoolNullableFilter<"TemplateRepository"> | boolean | null
    templates?: TemplateListRelationFilter
    organization?: XOR<OrganizationRelationFilter, OrganizationWhereInput>
    templateRepositoryTags?: TemplateRepositoryTagListRelationFilter
  }, "uid" | "isDeleted_name">

  export type TemplateRepositoryOrderByWithAggregationInput = {
    uid?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    kind?: SortOrder
    organizationUid?: SortOrder
    isPublic?: SortOrder
    iconId?: SortOrderInput | SortOrder
    isDeleted?: SortOrderInput | SortOrder
    _count?: TemplateRepositoryCountOrderByAggregateInput
    _max?: TemplateRepositoryMaxOrderByAggregateInput
    _min?: TemplateRepositoryMinOrderByAggregateInput
  }

  export type TemplateRepositoryScalarWhereWithAggregatesInput = {
    AND?: TemplateRepositoryScalarWhereWithAggregatesInput | TemplateRepositoryScalarWhereWithAggregatesInput[]
    OR?: TemplateRepositoryScalarWhereWithAggregatesInput[]
    NOT?: TemplateRepositoryScalarWhereWithAggregatesInput | TemplateRepositoryScalarWhereWithAggregatesInput[]
    uid?: UuidWithAggregatesFilter<"TemplateRepository"> | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"TemplateRepository"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TemplateRepository"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TemplateRepository"> | Date | string
    name?: StringWithAggregatesFilter<"TemplateRepository"> | string
    description?: StringNullableWithAggregatesFilter<"TemplateRepository"> | string | null
    kind?: EnumTemplateRepositoryKindWithAggregatesFilter<"TemplateRepository"> | $Enums.TemplateRepositoryKind
    organizationUid?: StringWithAggregatesFilter<"TemplateRepository"> | string
    isPublic?: BoolWithAggregatesFilter<"TemplateRepository"> | boolean
    iconId?: StringNullableWithAggregatesFilter<"TemplateRepository"> | string | null
    isDeleted?: BoolNullableWithAggregatesFilter<"TemplateRepository"> | boolean | null
  }

  export type TemplateWhereInput = {
    AND?: TemplateWhereInput | TemplateWhereInput[]
    OR?: TemplateWhereInput[]
    NOT?: TemplateWhereInput | TemplateWhereInput[]
    uid?: UuidFilter<"Template"> | string
    name?: StringFilter<"Template"> | string
    templateRepositoryUid?: StringFilter<"Template"> | string
    devboxReleaseImage?: StringNullableFilter<"Template"> | string | null
    image?: StringFilter<"Template"> | string
    config?: StringFilter<"Template"> | string
    deletedAt?: DateTimeNullableFilter<"Template"> | Date | string | null
    createdAt?: DateTimeFilter<"Template"> | Date | string
    updatedAt?: DateTimeFilter<"Template"> | Date | string
    parentUid?: UuidNullableFilter<"Template"> | string | null
    isDeleted?: BoolNullableFilter<"Template"> | boolean | null
    parent?: XOR<TemplateNullableRelationFilter, TemplateWhereInput> | null
    children?: TemplateListRelationFilter
    templateRepository?: XOR<TemplateRepositoryRelationFilter, TemplateRepositoryWhereInput>
  }

  export type TemplateOrderByWithRelationInput = {
    uid?: SortOrder
    name?: SortOrder
    templateRepositoryUid?: SortOrder
    devboxReleaseImage?: SortOrderInput | SortOrder
    image?: SortOrder
    config?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    parentUid?: SortOrderInput | SortOrder
    isDeleted?: SortOrderInput | SortOrder
    parent?: TemplateOrderByWithRelationInput
    children?: TemplateOrderByRelationAggregateInput
    templateRepository?: TemplateRepositoryOrderByWithRelationInput
  }

  export type TemplateWhereUniqueInput = Prisma.AtLeast<{
    uid?: string
    isDeleted_templateRepositoryUid_name?: TemplateIsDeletedTemplateRepositoryUidNameCompoundUniqueInput
    AND?: TemplateWhereInput | TemplateWhereInput[]
    OR?: TemplateWhereInput[]
    NOT?: TemplateWhereInput | TemplateWhereInput[]
    name?: StringFilter<"Template"> | string
    templateRepositoryUid?: StringFilter<"Template"> | string
    devboxReleaseImage?: StringNullableFilter<"Template"> | string | null
    image?: StringFilter<"Template"> | string
    config?: StringFilter<"Template"> | string
    deletedAt?: DateTimeNullableFilter<"Template"> | Date | string | null
    createdAt?: DateTimeFilter<"Template"> | Date | string
    updatedAt?: DateTimeFilter<"Template"> | Date | string
    parentUid?: UuidNullableFilter<"Template"> | string | null
    isDeleted?: BoolNullableFilter<"Template"> | boolean | null
    parent?: XOR<TemplateNullableRelationFilter, TemplateWhereInput> | null
    children?: TemplateListRelationFilter
    templateRepository?: XOR<TemplateRepositoryRelationFilter, TemplateRepositoryWhereInput>
  }, "uid" | "isDeleted_templateRepositoryUid_name">

  export type TemplateOrderByWithAggregationInput = {
    uid?: SortOrder
    name?: SortOrder
    templateRepositoryUid?: SortOrder
    devboxReleaseImage?: SortOrderInput | SortOrder
    image?: SortOrder
    config?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    parentUid?: SortOrderInput | SortOrder
    isDeleted?: SortOrderInput | SortOrder
    _count?: TemplateCountOrderByAggregateInput
    _max?: TemplateMaxOrderByAggregateInput
    _min?: TemplateMinOrderByAggregateInput
  }

  export type TemplateScalarWhereWithAggregatesInput = {
    AND?: TemplateScalarWhereWithAggregatesInput | TemplateScalarWhereWithAggregatesInput[]
    OR?: TemplateScalarWhereWithAggregatesInput[]
    NOT?: TemplateScalarWhereWithAggregatesInput | TemplateScalarWhereWithAggregatesInput[]
    uid?: UuidWithAggregatesFilter<"Template"> | string
    name?: StringWithAggregatesFilter<"Template"> | string
    templateRepositoryUid?: StringWithAggregatesFilter<"Template"> | string
    devboxReleaseImage?: StringNullableWithAggregatesFilter<"Template"> | string | null
    image?: StringWithAggregatesFilter<"Template"> | string
    config?: StringWithAggregatesFilter<"Template"> | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Template"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Template"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Template"> | Date | string
    parentUid?: UuidNullableWithAggregatesFilter<"Template"> | string | null
    isDeleted?: BoolNullableWithAggregatesFilter<"Template"> | boolean | null
  }

  export type TagWhereInput = {
    AND?: TagWhereInput | TagWhereInput[]
    OR?: TagWhereInput[]
    NOT?: TagWhereInput | TagWhereInput[]
    uid?: UuidFilter<"Tag"> | string
    name?: StringFilter<"Tag"> | string
    zhName?: StringNullableFilter<"Tag"> | string | null
    enName?: StringNullableFilter<"Tag"> | string | null
    templateRepositoryTags?: TemplateRepositoryTagListRelationFilter
  }

  export type TagOrderByWithRelationInput = {
    uid?: SortOrder
    name?: SortOrder
    zhName?: SortOrderInput | SortOrder
    enName?: SortOrderInput | SortOrder
    templateRepositoryTags?: TemplateRepositoryTagOrderByRelationAggregateInput
  }

  export type TagWhereUniqueInput = Prisma.AtLeast<{
    uid?: string
    AND?: TagWhereInput | TagWhereInput[]
    OR?: TagWhereInput[]
    NOT?: TagWhereInput | TagWhereInput[]
    name?: StringFilter<"Tag"> | string
    zhName?: StringNullableFilter<"Tag"> | string | null
    enName?: StringNullableFilter<"Tag"> | string | null
    templateRepositoryTags?: TemplateRepositoryTagListRelationFilter
  }, "uid">

  export type TagOrderByWithAggregationInput = {
    uid?: SortOrder
    name?: SortOrder
    zhName?: SortOrderInput | SortOrder
    enName?: SortOrderInput | SortOrder
    _count?: TagCountOrderByAggregateInput
    _max?: TagMaxOrderByAggregateInput
    _min?: TagMinOrderByAggregateInput
  }

  export type TagScalarWhereWithAggregatesInput = {
    AND?: TagScalarWhereWithAggregatesInput | TagScalarWhereWithAggregatesInput[]
    OR?: TagScalarWhereWithAggregatesInput[]
    NOT?: TagScalarWhereWithAggregatesInput | TagScalarWhereWithAggregatesInput[]
    uid?: UuidWithAggregatesFilter<"Tag"> | string
    name?: StringWithAggregatesFilter<"Tag"> | string
    zhName?: StringNullableWithAggregatesFilter<"Tag"> | string | null
    enName?: StringNullableWithAggregatesFilter<"Tag"> | string | null
  }

  export type TemplateRepositoryTagWhereInput = {
    AND?: TemplateRepositoryTagWhereInput | TemplateRepositoryTagWhereInput[]
    OR?: TemplateRepositoryTagWhereInput[]
    NOT?: TemplateRepositoryTagWhereInput | TemplateRepositoryTagWhereInput[]
    templateRepositoryUid?: UuidFilter<"TemplateRepositoryTag"> | string
    tagUid?: UuidFilter<"TemplateRepositoryTag"> | string
    templateRepository?: XOR<TemplateRepositoryRelationFilter, TemplateRepositoryWhereInput>
    tag?: XOR<TagRelationFilter, TagWhereInput>
  }

  export type TemplateRepositoryTagOrderByWithRelationInput = {
    templateRepositoryUid?: SortOrder
    tagUid?: SortOrder
    templateRepository?: TemplateRepositoryOrderByWithRelationInput
    tag?: TagOrderByWithRelationInput
  }

  export type TemplateRepositoryTagWhereUniqueInput = Prisma.AtLeast<{
    templateRepositoryUid_tagUid?: TemplateRepositoryTagTemplateRepositoryUidTagUidCompoundUniqueInput
    AND?: TemplateRepositoryTagWhereInput | TemplateRepositoryTagWhereInput[]
    OR?: TemplateRepositoryTagWhereInput[]
    NOT?: TemplateRepositoryTagWhereInput | TemplateRepositoryTagWhereInput[]
    templateRepositoryUid?: UuidFilter<"TemplateRepositoryTag"> | string
    tagUid?: UuidFilter<"TemplateRepositoryTag"> | string
    templateRepository?: XOR<TemplateRepositoryRelationFilter, TemplateRepositoryWhereInput>
    tag?: XOR<TagRelationFilter, TagWhereInput>
  }, "templateRepositoryUid_tagUid">

  export type TemplateRepositoryTagOrderByWithAggregationInput = {
    templateRepositoryUid?: SortOrder
    tagUid?: SortOrder
    _count?: TemplateRepositoryTagCountOrderByAggregateInput
    _max?: TemplateRepositoryTagMaxOrderByAggregateInput
    _min?: TemplateRepositoryTagMinOrderByAggregateInput
  }

  export type TemplateRepositoryTagScalarWhereWithAggregatesInput = {
    AND?: TemplateRepositoryTagScalarWhereWithAggregatesInput | TemplateRepositoryTagScalarWhereWithAggregatesInput[]
    OR?: TemplateRepositoryTagScalarWhereWithAggregatesInput[]
    NOT?: TemplateRepositoryTagScalarWhereWithAggregatesInput | TemplateRepositoryTagScalarWhereWithAggregatesInput[]
    templateRepositoryUid?: UuidWithAggregatesFilter<"TemplateRepositoryTag"> | string
    tagUid?: UuidWithAggregatesFilter<"TemplateRepositoryTag"> | string
  }

  export type UserCreateInput = {
    uid?: string
    regionUid: string
    namespaceId: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
    userOrganizations?: UserOrganizationCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    uid?: string
    regionUid: string
    namespaceId: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
    userOrganizations?: UserOrganizationUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    regionUid?: StringFieldUpdateOperationsInput | string
    namespaceId?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    userOrganizations?: UserOrganizationUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    regionUid?: StringFieldUpdateOperationsInput | string
    namespaceId?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    userOrganizations?: UserOrganizationUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    uid?: string
    regionUid: string
    namespaceId: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
  }

  export type UserUpdateManyMutationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    regionUid?: StringFieldUpdateOperationsInput | string
    namespaceId?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type UserUncheckedUpdateManyInput = {
    uid?: StringFieldUpdateOperationsInput | string
    regionUid?: StringFieldUpdateOperationsInput | string
    namespaceId?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type OrganizationCreateInput = {
    uid?: string
    id: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    isDeleted?: boolean | null
    name: string
    userOrganizations?: UserOrganizationCreateNestedManyWithoutOrganizationInput
    templateRepositories?: TemplateRepositoryCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateInput = {
    uid?: string
    id: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    isDeleted?: boolean | null
    name: string
    userOrganizations?: UserOrganizationUncheckedCreateNestedManyWithoutOrganizationInput
    templateRepositories?: TemplateRepositoryUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
    userOrganizations?: UserOrganizationUpdateManyWithoutOrganizationNestedInput
    templateRepositories?: TemplateRepositoryUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
    userOrganizations?: UserOrganizationUncheckedUpdateManyWithoutOrganizationNestedInput
    templateRepositories?: TemplateRepositoryUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationCreateManyInput = {
    uid?: string
    id: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    isDeleted?: boolean | null
    name: string
  }

  export type OrganizationUpdateManyMutationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
  }

  export type OrganizationUncheckedUpdateManyInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
  }

  export type UserOrganizationCreateInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutUserOrganizationsInput
    user: UserCreateNestedOneWithoutUserOrganizationsInput
  }

  export type UserOrganizationUncheckedCreateInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    userUid: string
    organizationUid: string
  }

  export type UserOrganizationUpdateInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutUserOrganizationsNestedInput
    user?: UserUpdateOneRequiredWithoutUserOrganizationsNestedInput
  }

  export type UserOrganizationUncheckedUpdateInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userUid?: StringFieldUpdateOperationsInput | string
    organizationUid?: StringFieldUpdateOperationsInput | string
  }

  export type UserOrganizationCreateManyInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    userUid: string
    organizationUid: string
  }

  export type UserOrganizationUpdateManyMutationInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserOrganizationUncheckedUpdateManyInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userUid?: StringFieldUpdateOperationsInput | string
    organizationUid?: StringFieldUpdateOperationsInput | string
  }

  export type TemplateRepositoryCreateInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    templates?: TemplateCreateNestedManyWithoutTemplateRepositoryInput
    organization: OrganizationCreateNestedOneWithoutTemplateRepositoriesInput
    templateRepositoryTags?: TemplateRepositoryTagCreateNestedManyWithoutTemplateRepositoryInput
  }

  export type TemplateRepositoryUncheckedCreateInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    organizationUid: string
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    templates?: TemplateUncheckedCreateNestedManyWithoutTemplateRepositoryInput
    templateRepositoryTags?: TemplateRepositoryTagUncheckedCreateNestedManyWithoutTemplateRepositoryInput
  }

  export type TemplateRepositoryUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    templates?: TemplateUpdateManyWithoutTemplateRepositoryNestedInput
    organization?: OrganizationUpdateOneRequiredWithoutTemplateRepositoriesNestedInput
    templateRepositoryTags?: TemplateRepositoryTagUpdateManyWithoutTemplateRepositoryNestedInput
  }

  export type TemplateRepositoryUncheckedUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    organizationUid?: StringFieldUpdateOperationsInput | string
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    templates?: TemplateUncheckedUpdateManyWithoutTemplateRepositoryNestedInput
    templateRepositoryTags?: TemplateRepositoryTagUncheckedUpdateManyWithoutTemplateRepositoryNestedInput
  }

  export type TemplateRepositoryCreateManyInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    organizationUid: string
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
  }

  export type TemplateRepositoryUpdateManyMutationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateRepositoryUncheckedUpdateManyInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    organizationUid?: StringFieldUpdateOperationsInput | string
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateCreateInput = {
    uid?: string
    name: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
    parent?: TemplateCreateNestedOneWithoutChildrenInput
    children?: TemplateCreateNestedManyWithoutParentInput
    templateRepository: TemplateRepositoryCreateNestedOneWithoutTemplatesInput
  }

  export type TemplateUncheckedCreateInput = {
    uid?: string
    name: string
    templateRepositoryUid: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    parentUid?: string | null
    isDeleted?: boolean | null
    children?: TemplateUncheckedCreateNestedManyWithoutParentInput
  }

  export type TemplateUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    parent?: TemplateUpdateOneWithoutChildrenNestedInput
    children?: TemplateUpdateManyWithoutParentNestedInput
    templateRepository?: TemplateRepositoryUpdateOneRequiredWithoutTemplatesNestedInput
  }

  export type TemplateUncheckedUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    parentUid?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    children?: TemplateUncheckedUpdateManyWithoutParentNestedInput
  }

  export type TemplateCreateManyInput = {
    uid?: string
    name: string
    templateRepositoryUid: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    parentUid?: string | null
    isDeleted?: boolean | null
  }

  export type TemplateUpdateManyMutationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateUncheckedUpdateManyInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    parentUid?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TagCreateInput = {
    uid?: string
    name: string
    zhName?: string | null
    enName?: string | null
    templateRepositoryTags?: TemplateRepositoryTagCreateNestedManyWithoutTagInput
  }

  export type TagUncheckedCreateInput = {
    uid?: string
    name: string
    zhName?: string | null
    enName?: string | null
    templateRepositoryTags?: TemplateRepositoryTagUncheckedCreateNestedManyWithoutTagInput
  }

  export type TagUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    zhName?: NullableStringFieldUpdateOperationsInput | string | null
    enName?: NullableStringFieldUpdateOperationsInput | string | null
    templateRepositoryTags?: TemplateRepositoryTagUpdateManyWithoutTagNestedInput
  }

  export type TagUncheckedUpdateInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    zhName?: NullableStringFieldUpdateOperationsInput | string | null
    enName?: NullableStringFieldUpdateOperationsInput | string | null
    templateRepositoryTags?: TemplateRepositoryTagUncheckedUpdateManyWithoutTagNestedInput
  }

  export type TagCreateManyInput = {
    uid?: string
    name: string
    zhName?: string | null
    enName?: string | null
  }

  export type TagUpdateManyMutationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    zhName?: NullableStringFieldUpdateOperationsInput | string | null
    enName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TagUncheckedUpdateManyInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    zhName?: NullableStringFieldUpdateOperationsInput | string | null
    enName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TemplateRepositoryTagCreateInput = {
    templateRepository: TemplateRepositoryCreateNestedOneWithoutTemplateRepositoryTagsInput
    tag: TagCreateNestedOneWithoutTemplateRepositoryTagsInput
  }

  export type TemplateRepositoryTagUncheckedCreateInput = {
    templateRepositoryUid: string
    tagUid: string
  }

  export type TemplateRepositoryTagUpdateInput = {
    templateRepository?: TemplateRepositoryUpdateOneRequiredWithoutTemplateRepositoryTagsNestedInput
    tag?: TagUpdateOneRequiredWithoutTemplateRepositoryTagsNestedInput
  }

  export type TemplateRepositoryTagUncheckedUpdateInput = {
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
    tagUid?: StringFieldUpdateOperationsInput | string
  }

  export type TemplateRepositoryTagCreateManyInput = {
    templateRepositoryUid: string
    tagUid: string
  }

  export type TemplateRepositoryTagUpdateManyMutationInput = {

  }

  export type TemplateRepositoryTagUncheckedUpdateManyInput = {
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
    tagUid?: StringFieldUpdateOperationsInput | string
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type UserOrganizationListRelationFilter = {
    every?: UserOrganizationWhereInput
    some?: UserOrganizationWhereInput
    none?: UserOrganizationWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserOrganizationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserIsDeletedRegionUidNamespaceIdCompoundUniqueInput = {
    isDeleted: boolean
    regionUid: string
    namespaceId: string
  }

  export type UserCountOrderByAggregateInput = {
    uid?: SortOrder
    regionUid?: SortOrder
    namespaceId?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    isDeleted?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    uid?: SortOrder
    regionUid?: SortOrder
    namespaceId?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    isDeleted?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    uid?: SortOrder
    regionUid?: SortOrder
    namespaceId?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    isDeleted?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type TemplateRepositoryListRelationFilter = {
    every?: TemplateRepositoryWhereInput
    some?: TemplateRepositoryWhereInput
    none?: TemplateRepositoryWhereInput
  }

  export type TemplateRepositoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrganizationCountOrderByAggregateInput = {
    uid?: SortOrder
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
    isDeleted?: SortOrder
    name?: SortOrder
  }

  export type OrganizationMaxOrderByAggregateInput = {
    uid?: SortOrder
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
    isDeleted?: SortOrder
    name?: SortOrder
  }

  export type OrganizationMinOrderByAggregateInput = {
    uid?: SortOrder
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
    isDeleted?: SortOrder
    name?: SortOrder
  }

  export type OrganizationRelationFilter = {
    is?: OrganizationWhereInput
    isNot?: OrganizationWhereInput
  }

  export type UserRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type UserOrganizationOrganizationUidUserUidCompoundUniqueInput = {
    organizationUid: string
    userUid: string
  }

  export type UserOrganizationCountOrderByAggregateInput = {
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userUid?: SortOrder
    organizationUid?: SortOrder
  }

  export type UserOrganizationMaxOrderByAggregateInput = {
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userUid?: SortOrder
    organizationUid?: SortOrder
  }

  export type UserOrganizationMinOrderByAggregateInput = {
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userUid?: SortOrder
    organizationUid?: SortOrder
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumTemplateRepositoryKindFilter<$PrismaModel = never> = {
    equals?: $Enums.TemplateRepositoryKind | EnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    in?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    not?: NestedEnumTemplateRepositoryKindFilter<$PrismaModel> | $Enums.TemplateRepositoryKind
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type TemplateListRelationFilter = {
    every?: TemplateWhereInput
    some?: TemplateWhereInput
    none?: TemplateWhereInput
  }

  export type TemplateRepositoryTagListRelationFilter = {
    every?: TemplateRepositoryTagWhereInput
    some?: TemplateRepositoryTagWhereInput
    none?: TemplateRepositoryTagWhereInput
  }

  export type TemplateOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TemplateRepositoryTagOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TemplateRepositoryIsDeletedNameCompoundUniqueInput = {
    isDeleted: boolean
    name: string
  }

  export type TemplateRepositoryCountOrderByAggregateInput = {
    uid?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    name?: SortOrder
    description?: SortOrder
    kind?: SortOrder
    organizationUid?: SortOrder
    isPublic?: SortOrder
    iconId?: SortOrder
    isDeleted?: SortOrder
  }

  export type TemplateRepositoryMaxOrderByAggregateInput = {
    uid?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    name?: SortOrder
    description?: SortOrder
    kind?: SortOrder
    organizationUid?: SortOrder
    isPublic?: SortOrder
    iconId?: SortOrder
    isDeleted?: SortOrder
  }

  export type TemplateRepositoryMinOrderByAggregateInput = {
    uid?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    name?: SortOrder
    description?: SortOrder
    kind?: SortOrder
    organizationUid?: SortOrder
    isPublic?: SortOrder
    iconId?: SortOrder
    isDeleted?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumTemplateRepositoryKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TemplateRepositoryKind | EnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    in?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    not?: NestedEnumTemplateRepositoryKindWithAggregatesFilter<$PrismaModel> | $Enums.TemplateRepositoryKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTemplateRepositoryKindFilter<$PrismaModel>
    _max?: NestedEnumTemplateRepositoryKindFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type TemplateNullableRelationFilter = {
    is?: TemplateWhereInput | null
    isNot?: TemplateWhereInput | null
  }

  export type TemplateRepositoryRelationFilter = {
    is?: TemplateRepositoryWhereInput
    isNot?: TemplateRepositoryWhereInput
  }

  export type TemplateIsDeletedTemplateRepositoryUidNameCompoundUniqueInput = {
    isDeleted: boolean
    templateRepositoryUid: string
    name: string
  }

  export type TemplateCountOrderByAggregateInput = {
    uid?: SortOrder
    name?: SortOrder
    templateRepositoryUid?: SortOrder
    devboxReleaseImage?: SortOrder
    image?: SortOrder
    config?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    parentUid?: SortOrder
    isDeleted?: SortOrder
  }

  export type TemplateMaxOrderByAggregateInput = {
    uid?: SortOrder
    name?: SortOrder
    templateRepositoryUid?: SortOrder
    devboxReleaseImage?: SortOrder
    image?: SortOrder
    config?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    parentUid?: SortOrder
    isDeleted?: SortOrder
  }

  export type TemplateMinOrderByAggregateInput = {
    uid?: SortOrder
    name?: SortOrder
    templateRepositoryUid?: SortOrder
    devboxReleaseImage?: SortOrder
    image?: SortOrder
    config?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    parentUid?: SortOrder
    isDeleted?: SortOrder
  }

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type TagCountOrderByAggregateInput = {
    uid?: SortOrder
    name?: SortOrder
    zhName?: SortOrder
    enName?: SortOrder
  }

  export type TagMaxOrderByAggregateInput = {
    uid?: SortOrder
    name?: SortOrder
    zhName?: SortOrder
    enName?: SortOrder
  }

  export type TagMinOrderByAggregateInput = {
    uid?: SortOrder
    name?: SortOrder
    zhName?: SortOrder
    enName?: SortOrder
  }

  export type TagRelationFilter = {
    is?: TagWhereInput
    isNot?: TagWhereInput
  }

  export type TemplateRepositoryTagTemplateRepositoryUidTagUidCompoundUniqueInput = {
    templateRepositoryUid: string
    tagUid: string
  }

  export type TemplateRepositoryTagCountOrderByAggregateInput = {
    templateRepositoryUid?: SortOrder
    tagUid?: SortOrder
  }

  export type TemplateRepositoryTagMaxOrderByAggregateInput = {
    templateRepositoryUid?: SortOrder
    tagUid?: SortOrder
  }

  export type TemplateRepositoryTagMinOrderByAggregateInput = {
    templateRepositoryUid?: SortOrder
    tagUid?: SortOrder
  }

  export type UserOrganizationCreateNestedManyWithoutUserInput = {
    create?: XOR<UserOrganizationCreateWithoutUserInput, UserOrganizationUncheckedCreateWithoutUserInput> | UserOrganizationCreateWithoutUserInput[] | UserOrganizationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutUserInput | UserOrganizationCreateOrConnectWithoutUserInput[]
    createMany?: UserOrganizationCreateManyUserInputEnvelope
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
  }

  export type UserOrganizationUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserOrganizationCreateWithoutUserInput, UserOrganizationUncheckedCreateWithoutUserInput> | UserOrganizationCreateWithoutUserInput[] | UserOrganizationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutUserInput | UserOrganizationCreateOrConnectWithoutUserInput[]
    createMany?: UserOrganizationCreateManyUserInputEnvelope
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type UserOrganizationUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserOrganizationCreateWithoutUserInput, UserOrganizationUncheckedCreateWithoutUserInput> | UserOrganizationCreateWithoutUserInput[] | UserOrganizationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutUserInput | UserOrganizationCreateOrConnectWithoutUserInput[]
    upsert?: UserOrganizationUpsertWithWhereUniqueWithoutUserInput | UserOrganizationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserOrganizationCreateManyUserInputEnvelope
    set?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    disconnect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    delete?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    update?: UserOrganizationUpdateWithWhereUniqueWithoutUserInput | UserOrganizationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserOrganizationUpdateManyWithWhereWithoutUserInput | UserOrganizationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserOrganizationScalarWhereInput | UserOrganizationScalarWhereInput[]
  }

  export type UserOrganizationUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserOrganizationCreateWithoutUserInput, UserOrganizationUncheckedCreateWithoutUserInput> | UserOrganizationCreateWithoutUserInput[] | UserOrganizationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutUserInput | UserOrganizationCreateOrConnectWithoutUserInput[]
    upsert?: UserOrganizationUpsertWithWhereUniqueWithoutUserInput | UserOrganizationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserOrganizationCreateManyUserInputEnvelope
    set?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    disconnect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    delete?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    update?: UserOrganizationUpdateWithWhereUniqueWithoutUserInput | UserOrganizationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserOrganizationUpdateManyWithWhereWithoutUserInput | UserOrganizationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserOrganizationScalarWhereInput | UserOrganizationScalarWhereInput[]
  }

  export type UserOrganizationCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<UserOrganizationCreateWithoutOrganizationInput, UserOrganizationUncheckedCreateWithoutOrganizationInput> | UserOrganizationCreateWithoutOrganizationInput[] | UserOrganizationUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutOrganizationInput | UserOrganizationCreateOrConnectWithoutOrganizationInput[]
    createMany?: UserOrganizationCreateManyOrganizationInputEnvelope
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
  }

  export type TemplateRepositoryCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<TemplateRepositoryCreateWithoutOrganizationInput, TemplateRepositoryUncheckedCreateWithoutOrganizationInput> | TemplateRepositoryCreateWithoutOrganizationInput[] | TemplateRepositoryUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutOrganizationInput | TemplateRepositoryCreateOrConnectWithoutOrganizationInput[]
    createMany?: TemplateRepositoryCreateManyOrganizationInputEnvelope
    connect?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
  }

  export type UserOrganizationUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<UserOrganizationCreateWithoutOrganizationInput, UserOrganizationUncheckedCreateWithoutOrganizationInput> | UserOrganizationCreateWithoutOrganizationInput[] | UserOrganizationUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutOrganizationInput | UserOrganizationCreateOrConnectWithoutOrganizationInput[]
    createMany?: UserOrganizationCreateManyOrganizationInputEnvelope
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
  }

  export type TemplateRepositoryUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<TemplateRepositoryCreateWithoutOrganizationInput, TemplateRepositoryUncheckedCreateWithoutOrganizationInput> | TemplateRepositoryCreateWithoutOrganizationInput[] | TemplateRepositoryUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutOrganizationInput | TemplateRepositoryCreateOrConnectWithoutOrganizationInput[]
    createMany?: TemplateRepositoryCreateManyOrganizationInputEnvelope
    connect?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
  }

  export type UserOrganizationUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<UserOrganizationCreateWithoutOrganizationInput, UserOrganizationUncheckedCreateWithoutOrganizationInput> | UserOrganizationCreateWithoutOrganizationInput[] | UserOrganizationUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutOrganizationInput | UserOrganizationCreateOrConnectWithoutOrganizationInput[]
    upsert?: UserOrganizationUpsertWithWhereUniqueWithoutOrganizationInput | UserOrganizationUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: UserOrganizationCreateManyOrganizationInputEnvelope
    set?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    disconnect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    delete?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    update?: UserOrganizationUpdateWithWhereUniqueWithoutOrganizationInput | UserOrganizationUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: UserOrganizationUpdateManyWithWhereWithoutOrganizationInput | UserOrganizationUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: UserOrganizationScalarWhereInput | UserOrganizationScalarWhereInput[]
  }

  export type TemplateRepositoryUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<TemplateRepositoryCreateWithoutOrganizationInput, TemplateRepositoryUncheckedCreateWithoutOrganizationInput> | TemplateRepositoryCreateWithoutOrganizationInput[] | TemplateRepositoryUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutOrganizationInput | TemplateRepositoryCreateOrConnectWithoutOrganizationInput[]
    upsert?: TemplateRepositoryUpsertWithWhereUniqueWithoutOrganizationInput | TemplateRepositoryUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: TemplateRepositoryCreateManyOrganizationInputEnvelope
    set?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    disconnect?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    delete?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    connect?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    update?: TemplateRepositoryUpdateWithWhereUniqueWithoutOrganizationInput | TemplateRepositoryUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: TemplateRepositoryUpdateManyWithWhereWithoutOrganizationInput | TemplateRepositoryUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: TemplateRepositoryScalarWhereInput | TemplateRepositoryScalarWhereInput[]
  }

  export type UserOrganizationUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<UserOrganizationCreateWithoutOrganizationInput, UserOrganizationUncheckedCreateWithoutOrganizationInput> | UserOrganizationCreateWithoutOrganizationInput[] | UserOrganizationUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: UserOrganizationCreateOrConnectWithoutOrganizationInput | UserOrganizationCreateOrConnectWithoutOrganizationInput[]
    upsert?: UserOrganizationUpsertWithWhereUniqueWithoutOrganizationInput | UserOrganizationUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: UserOrganizationCreateManyOrganizationInputEnvelope
    set?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    disconnect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    delete?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    connect?: UserOrganizationWhereUniqueInput | UserOrganizationWhereUniqueInput[]
    update?: UserOrganizationUpdateWithWhereUniqueWithoutOrganizationInput | UserOrganizationUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: UserOrganizationUpdateManyWithWhereWithoutOrganizationInput | UserOrganizationUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: UserOrganizationScalarWhereInput | UserOrganizationScalarWhereInput[]
  }

  export type TemplateRepositoryUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<TemplateRepositoryCreateWithoutOrganizationInput, TemplateRepositoryUncheckedCreateWithoutOrganizationInput> | TemplateRepositoryCreateWithoutOrganizationInput[] | TemplateRepositoryUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutOrganizationInput | TemplateRepositoryCreateOrConnectWithoutOrganizationInput[]
    upsert?: TemplateRepositoryUpsertWithWhereUniqueWithoutOrganizationInput | TemplateRepositoryUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: TemplateRepositoryCreateManyOrganizationInputEnvelope
    set?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    disconnect?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    delete?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    connect?: TemplateRepositoryWhereUniqueInput | TemplateRepositoryWhereUniqueInput[]
    update?: TemplateRepositoryUpdateWithWhereUniqueWithoutOrganizationInput | TemplateRepositoryUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: TemplateRepositoryUpdateManyWithWhereWithoutOrganizationInput | TemplateRepositoryUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: TemplateRepositoryScalarWhereInput | TemplateRepositoryScalarWhereInput[]
  }

  export type OrganizationCreateNestedOneWithoutUserOrganizationsInput = {
    create?: XOR<OrganizationCreateWithoutUserOrganizationsInput, OrganizationUncheckedCreateWithoutUserOrganizationsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutUserOrganizationsInput
    connect?: OrganizationWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutUserOrganizationsInput = {
    create?: XOR<UserCreateWithoutUserOrganizationsInput, UserUncheckedCreateWithoutUserOrganizationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUserOrganizationsInput
    connect?: UserWhereUniqueInput
  }

  export type OrganizationUpdateOneRequiredWithoutUserOrganizationsNestedInput = {
    create?: XOR<OrganizationCreateWithoutUserOrganizationsInput, OrganizationUncheckedCreateWithoutUserOrganizationsInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutUserOrganizationsInput
    upsert?: OrganizationUpsertWithoutUserOrganizationsInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutUserOrganizationsInput, OrganizationUpdateWithoutUserOrganizationsInput>, OrganizationUncheckedUpdateWithoutUserOrganizationsInput>
  }

  export type UserUpdateOneRequiredWithoutUserOrganizationsNestedInput = {
    create?: XOR<UserCreateWithoutUserOrganizationsInput, UserUncheckedCreateWithoutUserOrganizationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUserOrganizationsInput
    upsert?: UserUpsertWithoutUserOrganizationsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUserOrganizationsInput, UserUpdateWithoutUserOrganizationsInput>, UserUncheckedUpdateWithoutUserOrganizationsInput>
  }

  export type TemplateCreateNestedManyWithoutTemplateRepositoryInput = {
    create?: XOR<TemplateCreateWithoutTemplateRepositoryInput, TemplateUncheckedCreateWithoutTemplateRepositoryInput> | TemplateCreateWithoutTemplateRepositoryInput[] | TemplateUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutTemplateRepositoryInput | TemplateCreateOrConnectWithoutTemplateRepositoryInput[]
    createMany?: TemplateCreateManyTemplateRepositoryInputEnvelope
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
  }

  export type OrganizationCreateNestedOneWithoutTemplateRepositoriesInput = {
    create?: XOR<OrganizationCreateWithoutTemplateRepositoriesInput, OrganizationUncheckedCreateWithoutTemplateRepositoriesInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutTemplateRepositoriesInput
    connect?: OrganizationWhereUniqueInput
  }

  export type TemplateRepositoryTagCreateNestedManyWithoutTemplateRepositoryInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput> | TemplateRepositoryTagCreateWithoutTemplateRepositoryInput[] | TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput | TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput[]
    createMany?: TemplateRepositoryTagCreateManyTemplateRepositoryInputEnvelope
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
  }

  export type TemplateUncheckedCreateNestedManyWithoutTemplateRepositoryInput = {
    create?: XOR<TemplateCreateWithoutTemplateRepositoryInput, TemplateUncheckedCreateWithoutTemplateRepositoryInput> | TemplateCreateWithoutTemplateRepositoryInput[] | TemplateUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutTemplateRepositoryInput | TemplateCreateOrConnectWithoutTemplateRepositoryInput[]
    createMany?: TemplateCreateManyTemplateRepositoryInputEnvelope
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
  }

  export type TemplateRepositoryTagUncheckedCreateNestedManyWithoutTemplateRepositoryInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput> | TemplateRepositoryTagCreateWithoutTemplateRepositoryInput[] | TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput | TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput[]
    createMany?: TemplateRepositoryTagCreateManyTemplateRepositoryInputEnvelope
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumTemplateRepositoryKindFieldUpdateOperationsInput = {
    set?: $Enums.TemplateRepositoryKind
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type TemplateUpdateManyWithoutTemplateRepositoryNestedInput = {
    create?: XOR<TemplateCreateWithoutTemplateRepositoryInput, TemplateUncheckedCreateWithoutTemplateRepositoryInput> | TemplateCreateWithoutTemplateRepositoryInput[] | TemplateUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutTemplateRepositoryInput | TemplateCreateOrConnectWithoutTemplateRepositoryInput[]
    upsert?: TemplateUpsertWithWhereUniqueWithoutTemplateRepositoryInput | TemplateUpsertWithWhereUniqueWithoutTemplateRepositoryInput[]
    createMany?: TemplateCreateManyTemplateRepositoryInputEnvelope
    set?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    disconnect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    delete?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    update?: TemplateUpdateWithWhereUniqueWithoutTemplateRepositoryInput | TemplateUpdateWithWhereUniqueWithoutTemplateRepositoryInput[]
    updateMany?: TemplateUpdateManyWithWhereWithoutTemplateRepositoryInput | TemplateUpdateManyWithWhereWithoutTemplateRepositoryInput[]
    deleteMany?: TemplateScalarWhereInput | TemplateScalarWhereInput[]
  }

  export type OrganizationUpdateOneRequiredWithoutTemplateRepositoriesNestedInput = {
    create?: XOR<OrganizationCreateWithoutTemplateRepositoriesInput, OrganizationUncheckedCreateWithoutTemplateRepositoriesInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutTemplateRepositoriesInput
    upsert?: OrganizationUpsertWithoutTemplateRepositoriesInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutTemplateRepositoriesInput, OrganizationUpdateWithoutTemplateRepositoriesInput>, OrganizationUncheckedUpdateWithoutTemplateRepositoriesInput>
  }

  export type TemplateRepositoryTagUpdateManyWithoutTemplateRepositoryNestedInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput> | TemplateRepositoryTagCreateWithoutTemplateRepositoryInput[] | TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput | TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput[]
    upsert?: TemplateRepositoryTagUpsertWithWhereUniqueWithoutTemplateRepositoryInput | TemplateRepositoryTagUpsertWithWhereUniqueWithoutTemplateRepositoryInput[]
    createMany?: TemplateRepositoryTagCreateManyTemplateRepositoryInputEnvelope
    set?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    disconnect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    delete?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    update?: TemplateRepositoryTagUpdateWithWhereUniqueWithoutTemplateRepositoryInput | TemplateRepositoryTagUpdateWithWhereUniqueWithoutTemplateRepositoryInput[]
    updateMany?: TemplateRepositoryTagUpdateManyWithWhereWithoutTemplateRepositoryInput | TemplateRepositoryTagUpdateManyWithWhereWithoutTemplateRepositoryInput[]
    deleteMany?: TemplateRepositoryTagScalarWhereInput | TemplateRepositoryTagScalarWhereInput[]
  }

  export type TemplateUncheckedUpdateManyWithoutTemplateRepositoryNestedInput = {
    create?: XOR<TemplateCreateWithoutTemplateRepositoryInput, TemplateUncheckedCreateWithoutTemplateRepositoryInput> | TemplateCreateWithoutTemplateRepositoryInput[] | TemplateUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutTemplateRepositoryInput | TemplateCreateOrConnectWithoutTemplateRepositoryInput[]
    upsert?: TemplateUpsertWithWhereUniqueWithoutTemplateRepositoryInput | TemplateUpsertWithWhereUniqueWithoutTemplateRepositoryInput[]
    createMany?: TemplateCreateManyTemplateRepositoryInputEnvelope
    set?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    disconnect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    delete?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    update?: TemplateUpdateWithWhereUniqueWithoutTemplateRepositoryInput | TemplateUpdateWithWhereUniqueWithoutTemplateRepositoryInput[]
    updateMany?: TemplateUpdateManyWithWhereWithoutTemplateRepositoryInput | TemplateUpdateManyWithWhereWithoutTemplateRepositoryInput[]
    deleteMany?: TemplateScalarWhereInput | TemplateScalarWhereInput[]
  }

  export type TemplateRepositoryTagUncheckedUpdateManyWithoutTemplateRepositoryNestedInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput> | TemplateRepositoryTagCreateWithoutTemplateRepositoryInput[] | TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput | TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput[]
    upsert?: TemplateRepositoryTagUpsertWithWhereUniqueWithoutTemplateRepositoryInput | TemplateRepositoryTagUpsertWithWhereUniqueWithoutTemplateRepositoryInput[]
    createMany?: TemplateRepositoryTagCreateManyTemplateRepositoryInputEnvelope
    set?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    disconnect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    delete?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    update?: TemplateRepositoryTagUpdateWithWhereUniqueWithoutTemplateRepositoryInput | TemplateRepositoryTagUpdateWithWhereUniqueWithoutTemplateRepositoryInput[]
    updateMany?: TemplateRepositoryTagUpdateManyWithWhereWithoutTemplateRepositoryInput | TemplateRepositoryTagUpdateManyWithWhereWithoutTemplateRepositoryInput[]
    deleteMany?: TemplateRepositoryTagScalarWhereInput | TemplateRepositoryTagScalarWhereInput[]
  }

  export type TemplateCreateNestedOneWithoutChildrenInput = {
    create?: XOR<TemplateCreateWithoutChildrenInput, TemplateUncheckedCreateWithoutChildrenInput>
    connectOrCreate?: TemplateCreateOrConnectWithoutChildrenInput
    connect?: TemplateWhereUniqueInput
  }

  export type TemplateCreateNestedManyWithoutParentInput = {
    create?: XOR<TemplateCreateWithoutParentInput, TemplateUncheckedCreateWithoutParentInput> | TemplateCreateWithoutParentInput[] | TemplateUncheckedCreateWithoutParentInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutParentInput | TemplateCreateOrConnectWithoutParentInput[]
    createMany?: TemplateCreateManyParentInputEnvelope
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
  }

  export type TemplateRepositoryCreateNestedOneWithoutTemplatesInput = {
    create?: XOR<TemplateRepositoryCreateWithoutTemplatesInput, TemplateRepositoryUncheckedCreateWithoutTemplatesInput>
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutTemplatesInput
    connect?: TemplateRepositoryWhereUniqueInput
  }

  export type TemplateUncheckedCreateNestedManyWithoutParentInput = {
    create?: XOR<TemplateCreateWithoutParentInput, TemplateUncheckedCreateWithoutParentInput> | TemplateCreateWithoutParentInput[] | TemplateUncheckedCreateWithoutParentInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutParentInput | TemplateCreateOrConnectWithoutParentInput[]
    createMany?: TemplateCreateManyParentInputEnvelope
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
  }

  export type TemplateUpdateOneWithoutChildrenNestedInput = {
    create?: XOR<TemplateCreateWithoutChildrenInput, TemplateUncheckedCreateWithoutChildrenInput>
    connectOrCreate?: TemplateCreateOrConnectWithoutChildrenInput
    upsert?: TemplateUpsertWithoutChildrenInput
    disconnect?: TemplateWhereInput | boolean
    delete?: TemplateWhereInput | boolean
    connect?: TemplateWhereUniqueInput
    update?: XOR<XOR<TemplateUpdateToOneWithWhereWithoutChildrenInput, TemplateUpdateWithoutChildrenInput>, TemplateUncheckedUpdateWithoutChildrenInput>
  }

  export type TemplateUpdateManyWithoutParentNestedInput = {
    create?: XOR<TemplateCreateWithoutParentInput, TemplateUncheckedCreateWithoutParentInput> | TemplateCreateWithoutParentInput[] | TemplateUncheckedCreateWithoutParentInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutParentInput | TemplateCreateOrConnectWithoutParentInput[]
    upsert?: TemplateUpsertWithWhereUniqueWithoutParentInput | TemplateUpsertWithWhereUniqueWithoutParentInput[]
    createMany?: TemplateCreateManyParentInputEnvelope
    set?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    disconnect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    delete?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    update?: TemplateUpdateWithWhereUniqueWithoutParentInput | TemplateUpdateWithWhereUniqueWithoutParentInput[]
    updateMany?: TemplateUpdateManyWithWhereWithoutParentInput | TemplateUpdateManyWithWhereWithoutParentInput[]
    deleteMany?: TemplateScalarWhereInput | TemplateScalarWhereInput[]
  }

  export type TemplateRepositoryUpdateOneRequiredWithoutTemplatesNestedInput = {
    create?: XOR<TemplateRepositoryCreateWithoutTemplatesInput, TemplateRepositoryUncheckedCreateWithoutTemplatesInput>
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutTemplatesInput
    upsert?: TemplateRepositoryUpsertWithoutTemplatesInput
    connect?: TemplateRepositoryWhereUniqueInput
    update?: XOR<XOR<TemplateRepositoryUpdateToOneWithWhereWithoutTemplatesInput, TemplateRepositoryUpdateWithoutTemplatesInput>, TemplateRepositoryUncheckedUpdateWithoutTemplatesInput>
  }

  export type TemplateUncheckedUpdateManyWithoutParentNestedInput = {
    create?: XOR<TemplateCreateWithoutParentInput, TemplateUncheckedCreateWithoutParentInput> | TemplateCreateWithoutParentInput[] | TemplateUncheckedCreateWithoutParentInput[]
    connectOrCreate?: TemplateCreateOrConnectWithoutParentInput | TemplateCreateOrConnectWithoutParentInput[]
    upsert?: TemplateUpsertWithWhereUniqueWithoutParentInput | TemplateUpsertWithWhereUniqueWithoutParentInput[]
    createMany?: TemplateCreateManyParentInputEnvelope
    set?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    disconnect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    delete?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    connect?: TemplateWhereUniqueInput | TemplateWhereUniqueInput[]
    update?: TemplateUpdateWithWhereUniqueWithoutParentInput | TemplateUpdateWithWhereUniqueWithoutParentInput[]
    updateMany?: TemplateUpdateManyWithWhereWithoutParentInput | TemplateUpdateManyWithWhereWithoutParentInput[]
    deleteMany?: TemplateScalarWhereInput | TemplateScalarWhereInput[]
  }

  export type TemplateRepositoryTagCreateNestedManyWithoutTagInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTagInput, TemplateRepositoryTagUncheckedCreateWithoutTagInput> | TemplateRepositoryTagCreateWithoutTagInput[] | TemplateRepositoryTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTagInput | TemplateRepositoryTagCreateOrConnectWithoutTagInput[]
    createMany?: TemplateRepositoryTagCreateManyTagInputEnvelope
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
  }

  export type TemplateRepositoryTagUncheckedCreateNestedManyWithoutTagInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTagInput, TemplateRepositoryTagUncheckedCreateWithoutTagInput> | TemplateRepositoryTagCreateWithoutTagInput[] | TemplateRepositoryTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTagInput | TemplateRepositoryTagCreateOrConnectWithoutTagInput[]
    createMany?: TemplateRepositoryTagCreateManyTagInputEnvelope
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
  }

  export type TemplateRepositoryTagUpdateManyWithoutTagNestedInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTagInput, TemplateRepositoryTagUncheckedCreateWithoutTagInput> | TemplateRepositoryTagCreateWithoutTagInput[] | TemplateRepositoryTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTagInput | TemplateRepositoryTagCreateOrConnectWithoutTagInput[]
    upsert?: TemplateRepositoryTagUpsertWithWhereUniqueWithoutTagInput | TemplateRepositoryTagUpsertWithWhereUniqueWithoutTagInput[]
    createMany?: TemplateRepositoryTagCreateManyTagInputEnvelope
    set?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    disconnect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    delete?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    update?: TemplateRepositoryTagUpdateWithWhereUniqueWithoutTagInput | TemplateRepositoryTagUpdateWithWhereUniqueWithoutTagInput[]
    updateMany?: TemplateRepositoryTagUpdateManyWithWhereWithoutTagInput | TemplateRepositoryTagUpdateManyWithWhereWithoutTagInput[]
    deleteMany?: TemplateRepositoryTagScalarWhereInput | TemplateRepositoryTagScalarWhereInput[]
  }

  export type TemplateRepositoryTagUncheckedUpdateManyWithoutTagNestedInput = {
    create?: XOR<TemplateRepositoryTagCreateWithoutTagInput, TemplateRepositoryTagUncheckedCreateWithoutTagInput> | TemplateRepositoryTagCreateWithoutTagInput[] | TemplateRepositoryTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TemplateRepositoryTagCreateOrConnectWithoutTagInput | TemplateRepositoryTagCreateOrConnectWithoutTagInput[]
    upsert?: TemplateRepositoryTagUpsertWithWhereUniqueWithoutTagInput | TemplateRepositoryTagUpsertWithWhereUniqueWithoutTagInput[]
    createMany?: TemplateRepositoryTagCreateManyTagInputEnvelope
    set?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    disconnect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    delete?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    connect?: TemplateRepositoryTagWhereUniqueInput | TemplateRepositoryTagWhereUniqueInput[]
    update?: TemplateRepositoryTagUpdateWithWhereUniqueWithoutTagInput | TemplateRepositoryTagUpdateWithWhereUniqueWithoutTagInput[]
    updateMany?: TemplateRepositoryTagUpdateManyWithWhereWithoutTagInput | TemplateRepositoryTagUpdateManyWithWhereWithoutTagInput[]
    deleteMany?: TemplateRepositoryTagScalarWhereInput | TemplateRepositoryTagScalarWhereInput[]
  }

  export type TemplateRepositoryCreateNestedOneWithoutTemplateRepositoryTagsInput = {
    create?: XOR<TemplateRepositoryCreateWithoutTemplateRepositoryTagsInput, TemplateRepositoryUncheckedCreateWithoutTemplateRepositoryTagsInput>
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutTemplateRepositoryTagsInput
    connect?: TemplateRepositoryWhereUniqueInput
  }

  export type TagCreateNestedOneWithoutTemplateRepositoryTagsInput = {
    create?: XOR<TagCreateWithoutTemplateRepositoryTagsInput, TagUncheckedCreateWithoutTemplateRepositoryTagsInput>
    connectOrCreate?: TagCreateOrConnectWithoutTemplateRepositoryTagsInput
    connect?: TagWhereUniqueInput
  }

  export type TemplateRepositoryUpdateOneRequiredWithoutTemplateRepositoryTagsNestedInput = {
    create?: XOR<TemplateRepositoryCreateWithoutTemplateRepositoryTagsInput, TemplateRepositoryUncheckedCreateWithoutTemplateRepositoryTagsInput>
    connectOrCreate?: TemplateRepositoryCreateOrConnectWithoutTemplateRepositoryTagsInput
    upsert?: TemplateRepositoryUpsertWithoutTemplateRepositoryTagsInput
    connect?: TemplateRepositoryWhereUniqueInput
    update?: XOR<XOR<TemplateRepositoryUpdateToOneWithWhereWithoutTemplateRepositoryTagsInput, TemplateRepositoryUpdateWithoutTemplateRepositoryTagsInput>, TemplateRepositoryUncheckedUpdateWithoutTemplateRepositoryTagsInput>
  }

  export type TagUpdateOneRequiredWithoutTemplateRepositoryTagsNestedInput = {
    create?: XOR<TagCreateWithoutTemplateRepositoryTagsInput, TagUncheckedCreateWithoutTemplateRepositoryTagsInput>
    connectOrCreate?: TagCreateOrConnectWithoutTemplateRepositoryTagsInput
    upsert?: TagUpsertWithoutTemplateRepositoryTagsInput
    connect?: TagWhereUniqueInput
    update?: XOR<XOR<TagUpdateToOneWithWhereWithoutTemplateRepositoryTagsInput, TagUpdateWithoutTemplateRepositoryTagsInput>, TagUncheckedUpdateWithoutTemplateRepositoryTagsInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumTemplateRepositoryKindFilter<$PrismaModel = never> = {
    equals?: $Enums.TemplateRepositoryKind | EnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    in?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    not?: NestedEnumTemplateRepositoryKindFilter<$PrismaModel> | $Enums.TemplateRepositoryKind
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumTemplateRepositoryKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TemplateRepositoryKind | EnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    in?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.TemplateRepositoryKind[] | ListEnumTemplateRepositoryKindFieldRefInput<$PrismaModel>
    not?: NestedEnumTemplateRepositoryKindWithAggregatesFilter<$PrismaModel> | $Enums.TemplateRepositoryKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTemplateRepositoryKindFilter<$PrismaModel>
    _max?: NestedEnumTemplateRepositoryKindFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type UserOrganizationCreateWithoutUserInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutUserOrganizationsInput
  }

  export type UserOrganizationUncheckedCreateWithoutUserInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    organizationUid: string
  }

  export type UserOrganizationCreateOrConnectWithoutUserInput = {
    where: UserOrganizationWhereUniqueInput
    create: XOR<UserOrganizationCreateWithoutUserInput, UserOrganizationUncheckedCreateWithoutUserInput>
  }

  export type UserOrganizationCreateManyUserInputEnvelope = {
    data: UserOrganizationCreateManyUserInput | UserOrganizationCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UserOrganizationUpsertWithWhereUniqueWithoutUserInput = {
    where: UserOrganizationWhereUniqueInput
    update: XOR<UserOrganizationUpdateWithoutUserInput, UserOrganizationUncheckedUpdateWithoutUserInput>
    create: XOR<UserOrganizationCreateWithoutUserInput, UserOrganizationUncheckedCreateWithoutUserInput>
  }

  export type UserOrganizationUpdateWithWhereUniqueWithoutUserInput = {
    where: UserOrganizationWhereUniqueInput
    data: XOR<UserOrganizationUpdateWithoutUserInput, UserOrganizationUncheckedUpdateWithoutUserInput>
  }

  export type UserOrganizationUpdateManyWithWhereWithoutUserInput = {
    where: UserOrganizationScalarWhereInput
    data: XOR<UserOrganizationUpdateManyMutationInput, UserOrganizationUncheckedUpdateManyWithoutUserInput>
  }

  export type UserOrganizationScalarWhereInput = {
    AND?: UserOrganizationScalarWhereInput | UserOrganizationScalarWhereInput[]
    OR?: UserOrganizationScalarWhereInput[]
    NOT?: UserOrganizationScalarWhereInput | UserOrganizationScalarWhereInput[]
    createdAt?: DateTimeFilter<"UserOrganization"> | Date | string
    updatedAt?: DateTimeFilter<"UserOrganization"> | Date | string
    userUid?: UuidFilter<"UserOrganization"> | string
    organizationUid?: UuidFilter<"UserOrganization"> | string
  }

  export type UserOrganizationCreateWithoutOrganizationInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutUserOrganizationsInput
  }

  export type UserOrganizationUncheckedCreateWithoutOrganizationInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    userUid: string
  }

  export type UserOrganizationCreateOrConnectWithoutOrganizationInput = {
    where: UserOrganizationWhereUniqueInput
    create: XOR<UserOrganizationCreateWithoutOrganizationInput, UserOrganizationUncheckedCreateWithoutOrganizationInput>
  }

  export type UserOrganizationCreateManyOrganizationInputEnvelope = {
    data: UserOrganizationCreateManyOrganizationInput | UserOrganizationCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type TemplateRepositoryCreateWithoutOrganizationInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    templates?: TemplateCreateNestedManyWithoutTemplateRepositoryInput
    templateRepositoryTags?: TemplateRepositoryTagCreateNestedManyWithoutTemplateRepositoryInput
  }

  export type TemplateRepositoryUncheckedCreateWithoutOrganizationInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    templates?: TemplateUncheckedCreateNestedManyWithoutTemplateRepositoryInput
    templateRepositoryTags?: TemplateRepositoryTagUncheckedCreateNestedManyWithoutTemplateRepositoryInput
  }

  export type TemplateRepositoryCreateOrConnectWithoutOrganizationInput = {
    where: TemplateRepositoryWhereUniqueInput
    create: XOR<TemplateRepositoryCreateWithoutOrganizationInput, TemplateRepositoryUncheckedCreateWithoutOrganizationInput>
  }

  export type TemplateRepositoryCreateManyOrganizationInputEnvelope = {
    data: TemplateRepositoryCreateManyOrganizationInput | TemplateRepositoryCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type UserOrganizationUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: UserOrganizationWhereUniqueInput
    update: XOR<UserOrganizationUpdateWithoutOrganizationInput, UserOrganizationUncheckedUpdateWithoutOrganizationInput>
    create: XOR<UserOrganizationCreateWithoutOrganizationInput, UserOrganizationUncheckedCreateWithoutOrganizationInput>
  }

  export type UserOrganizationUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: UserOrganizationWhereUniqueInput
    data: XOR<UserOrganizationUpdateWithoutOrganizationInput, UserOrganizationUncheckedUpdateWithoutOrganizationInput>
  }

  export type UserOrganizationUpdateManyWithWhereWithoutOrganizationInput = {
    where: UserOrganizationScalarWhereInput
    data: XOR<UserOrganizationUpdateManyMutationInput, UserOrganizationUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type TemplateRepositoryUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: TemplateRepositoryWhereUniqueInput
    update: XOR<TemplateRepositoryUpdateWithoutOrganizationInput, TemplateRepositoryUncheckedUpdateWithoutOrganizationInput>
    create: XOR<TemplateRepositoryCreateWithoutOrganizationInput, TemplateRepositoryUncheckedCreateWithoutOrganizationInput>
  }

  export type TemplateRepositoryUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: TemplateRepositoryWhereUniqueInput
    data: XOR<TemplateRepositoryUpdateWithoutOrganizationInput, TemplateRepositoryUncheckedUpdateWithoutOrganizationInput>
  }

  export type TemplateRepositoryUpdateManyWithWhereWithoutOrganizationInput = {
    where: TemplateRepositoryScalarWhereInput
    data: XOR<TemplateRepositoryUpdateManyMutationInput, TemplateRepositoryUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type TemplateRepositoryScalarWhereInput = {
    AND?: TemplateRepositoryScalarWhereInput | TemplateRepositoryScalarWhereInput[]
    OR?: TemplateRepositoryScalarWhereInput[]
    NOT?: TemplateRepositoryScalarWhereInput | TemplateRepositoryScalarWhereInput[]
    uid?: UuidFilter<"TemplateRepository"> | string
    deletedAt?: DateTimeNullableFilter<"TemplateRepository"> | Date | string | null
    createdAt?: DateTimeFilter<"TemplateRepository"> | Date | string
    updatedAt?: DateTimeFilter<"TemplateRepository"> | Date | string
    name?: StringFilter<"TemplateRepository"> | string
    description?: StringNullableFilter<"TemplateRepository"> | string | null
    kind?: EnumTemplateRepositoryKindFilter<"TemplateRepository"> | $Enums.TemplateRepositoryKind
    organizationUid?: StringFilter<"TemplateRepository"> | string
    isPublic?: BoolFilter<"TemplateRepository"> | boolean
    iconId?: StringNullableFilter<"TemplateRepository"> | string | null
    isDeleted?: BoolNullableFilter<"TemplateRepository"> | boolean | null
  }

  export type OrganizationCreateWithoutUserOrganizationsInput = {
    uid?: string
    id: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    isDeleted?: boolean | null
    name: string
    templateRepositories?: TemplateRepositoryCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutUserOrganizationsInput = {
    uid?: string
    id: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    isDeleted?: boolean | null
    name: string
    templateRepositories?: TemplateRepositoryUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutUserOrganizationsInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutUserOrganizationsInput, OrganizationUncheckedCreateWithoutUserOrganizationsInput>
  }

  export type UserCreateWithoutUserOrganizationsInput = {
    uid?: string
    regionUid: string
    namespaceId: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
  }

  export type UserUncheckedCreateWithoutUserOrganizationsInput = {
    uid?: string
    regionUid: string
    namespaceId: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
  }

  export type UserCreateOrConnectWithoutUserOrganizationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUserOrganizationsInput, UserUncheckedCreateWithoutUserOrganizationsInput>
  }

  export type OrganizationUpsertWithoutUserOrganizationsInput = {
    update: XOR<OrganizationUpdateWithoutUserOrganizationsInput, OrganizationUncheckedUpdateWithoutUserOrganizationsInput>
    create: XOR<OrganizationCreateWithoutUserOrganizationsInput, OrganizationUncheckedCreateWithoutUserOrganizationsInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutUserOrganizationsInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutUserOrganizationsInput, OrganizationUncheckedUpdateWithoutUserOrganizationsInput>
  }

  export type OrganizationUpdateWithoutUserOrganizationsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
    templateRepositories?: TemplateRepositoryUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutUserOrganizationsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
    templateRepositories?: TemplateRepositoryUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type UserUpsertWithoutUserOrganizationsInput = {
    update: XOR<UserUpdateWithoutUserOrganizationsInput, UserUncheckedUpdateWithoutUserOrganizationsInput>
    create: XOR<UserCreateWithoutUserOrganizationsInput, UserUncheckedCreateWithoutUserOrganizationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUserOrganizationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUserOrganizationsInput, UserUncheckedUpdateWithoutUserOrganizationsInput>
  }

  export type UserUpdateWithoutUserOrganizationsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    regionUid?: StringFieldUpdateOperationsInput | string
    namespaceId?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type UserUncheckedUpdateWithoutUserOrganizationsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    regionUid?: StringFieldUpdateOperationsInput | string
    namespaceId?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateCreateWithoutTemplateRepositoryInput = {
    uid?: string
    name: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
    parent?: TemplateCreateNestedOneWithoutChildrenInput
    children?: TemplateCreateNestedManyWithoutParentInput
  }

  export type TemplateUncheckedCreateWithoutTemplateRepositoryInput = {
    uid?: string
    name: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    parentUid?: string | null
    isDeleted?: boolean | null
    children?: TemplateUncheckedCreateNestedManyWithoutParentInput
  }

  export type TemplateCreateOrConnectWithoutTemplateRepositoryInput = {
    where: TemplateWhereUniqueInput
    create: XOR<TemplateCreateWithoutTemplateRepositoryInput, TemplateUncheckedCreateWithoutTemplateRepositoryInput>
  }

  export type TemplateCreateManyTemplateRepositoryInputEnvelope = {
    data: TemplateCreateManyTemplateRepositoryInput | TemplateCreateManyTemplateRepositoryInput[]
    skipDuplicates?: boolean
  }

  export type OrganizationCreateWithoutTemplateRepositoriesInput = {
    uid?: string
    id: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    isDeleted?: boolean | null
    name: string
    userOrganizations?: UserOrganizationCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateWithoutTemplateRepositoriesInput = {
    uid?: string
    id: string
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    isDeleted?: boolean | null
    name: string
    userOrganizations?: UserOrganizationUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationCreateOrConnectWithoutTemplateRepositoriesInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutTemplateRepositoriesInput, OrganizationUncheckedCreateWithoutTemplateRepositoriesInput>
  }

  export type TemplateRepositoryTagCreateWithoutTemplateRepositoryInput = {
    tag: TagCreateNestedOneWithoutTemplateRepositoryTagsInput
  }

  export type TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput = {
    tagUid: string
  }

  export type TemplateRepositoryTagCreateOrConnectWithoutTemplateRepositoryInput = {
    where: TemplateRepositoryTagWhereUniqueInput
    create: XOR<TemplateRepositoryTagCreateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput>
  }

  export type TemplateRepositoryTagCreateManyTemplateRepositoryInputEnvelope = {
    data: TemplateRepositoryTagCreateManyTemplateRepositoryInput | TemplateRepositoryTagCreateManyTemplateRepositoryInput[]
    skipDuplicates?: boolean
  }

  export type TemplateUpsertWithWhereUniqueWithoutTemplateRepositoryInput = {
    where: TemplateWhereUniqueInput
    update: XOR<TemplateUpdateWithoutTemplateRepositoryInput, TemplateUncheckedUpdateWithoutTemplateRepositoryInput>
    create: XOR<TemplateCreateWithoutTemplateRepositoryInput, TemplateUncheckedCreateWithoutTemplateRepositoryInput>
  }

  export type TemplateUpdateWithWhereUniqueWithoutTemplateRepositoryInput = {
    where: TemplateWhereUniqueInput
    data: XOR<TemplateUpdateWithoutTemplateRepositoryInput, TemplateUncheckedUpdateWithoutTemplateRepositoryInput>
  }

  export type TemplateUpdateManyWithWhereWithoutTemplateRepositoryInput = {
    where: TemplateScalarWhereInput
    data: XOR<TemplateUpdateManyMutationInput, TemplateUncheckedUpdateManyWithoutTemplateRepositoryInput>
  }

  export type TemplateScalarWhereInput = {
    AND?: TemplateScalarWhereInput | TemplateScalarWhereInput[]
    OR?: TemplateScalarWhereInput[]
    NOT?: TemplateScalarWhereInput | TemplateScalarWhereInput[]
    uid?: UuidFilter<"Template"> | string
    name?: StringFilter<"Template"> | string
    templateRepositoryUid?: StringFilter<"Template"> | string
    devboxReleaseImage?: StringNullableFilter<"Template"> | string | null
    image?: StringFilter<"Template"> | string
    config?: StringFilter<"Template"> | string
    deletedAt?: DateTimeNullableFilter<"Template"> | Date | string | null
    createdAt?: DateTimeFilter<"Template"> | Date | string
    updatedAt?: DateTimeFilter<"Template"> | Date | string
    parentUid?: UuidNullableFilter<"Template"> | string | null
    isDeleted?: BoolNullableFilter<"Template"> | boolean | null
  }

  export type OrganizationUpsertWithoutTemplateRepositoriesInput = {
    update: XOR<OrganizationUpdateWithoutTemplateRepositoriesInput, OrganizationUncheckedUpdateWithoutTemplateRepositoriesInput>
    create: XOR<OrganizationCreateWithoutTemplateRepositoriesInput, OrganizationUncheckedCreateWithoutTemplateRepositoriesInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutTemplateRepositoriesInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutTemplateRepositoriesInput, OrganizationUncheckedUpdateWithoutTemplateRepositoriesInput>
  }

  export type OrganizationUpdateWithoutTemplateRepositoriesInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
    userOrganizations?: UserOrganizationUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateWithoutTemplateRepositoriesInput = {
    uid?: StringFieldUpdateOperationsInput | string
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    name?: StringFieldUpdateOperationsInput | string
    userOrganizations?: UserOrganizationUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type TemplateRepositoryTagUpsertWithWhereUniqueWithoutTemplateRepositoryInput = {
    where: TemplateRepositoryTagWhereUniqueInput
    update: XOR<TemplateRepositoryTagUpdateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedUpdateWithoutTemplateRepositoryInput>
    create: XOR<TemplateRepositoryTagCreateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedCreateWithoutTemplateRepositoryInput>
  }

  export type TemplateRepositoryTagUpdateWithWhereUniqueWithoutTemplateRepositoryInput = {
    where: TemplateRepositoryTagWhereUniqueInput
    data: XOR<TemplateRepositoryTagUpdateWithoutTemplateRepositoryInput, TemplateRepositoryTagUncheckedUpdateWithoutTemplateRepositoryInput>
  }

  export type TemplateRepositoryTagUpdateManyWithWhereWithoutTemplateRepositoryInput = {
    where: TemplateRepositoryTagScalarWhereInput
    data: XOR<TemplateRepositoryTagUpdateManyMutationInput, TemplateRepositoryTagUncheckedUpdateManyWithoutTemplateRepositoryInput>
  }

  export type TemplateRepositoryTagScalarWhereInput = {
    AND?: TemplateRepositoryTagScalarWhereInput | TemplateRepositoryTagScalarWhereInput[]
    OR?: TemplateRepositoryTagScalarWhereInput[]
    NOT?: TemplateRepositoryTagScalarWhereInput | TemplateRepositoryTagScalarWhereInput[]
    templateRepositoryUid?: UuidFilter<"TemplateRepositoryTag"> | string
    tagUid?: UuidFilter<"TemplateRepositoryTag"> | string
  }

  export type TemplateCreateWithoutChildrenInput = {
    uid?: string
    name: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
    parent?: TemplateCreateNestedOneWithoutChildrenInput
    templateRepository: TemplateRepositoryCreateNestedOneWithoutTemplatesInput
  }

  export type TemplateUncheckedCreateWithoutChildrenInput = {
    uid?: string
    name: string
    templateRepositoryUid: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    parentUid?: string | null
    isDeleted?: boolean | null
  }

  export type TemplateCreateOrConnectWithoutChildrenInput = {
    where: TemplateWhereUniqueInput
    create: XOR<TemplateCreateWithoutChildrenInput, TemplateUncheckedCreateWithoutChildrenInput>
  }

  export type TemplateCreateWithoutParentInput = {
    uid?: string
    name: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
    children?: TemplateCreateNestedManyWithoutParentInput
    templateRepository: TemplateRepositoryCreateNestedOneWithoutTemplatesInput
  }

  export type TemplateUncheckedCreateWithoutParentInput = {
    uid?: string
    name: string
    templateRepositoryUid: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
    children?: TemplateUncheckedCreateNestedManyWithoutParentInput
  }

  export type TemplateCreateOrConnectWithoutParentInput = {
    where: TemplateWhereUniqueInput
    create: XOR<TemplateCreateWithoutParentInput, TemplateUncheckedCreateWithoutParentInput>
  }

  export type TemplateCreateManyParentInputEnvelope = {
    data: TemplateCreateManyParentInput | TemplateCreateManyParentInput[]
    skipDuplicates?: boolean
  }

  export type TemplateRepositoryCreateWithoutTemplatesInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    organization: OrganizationCreateNestedOneWithoutTemplateRepositoriesInput
    templateRepositoryTags?: TemplateRepositoryTagCreateNestedManyWithoutTemplateRepositoryInput
  }

  export type TemplateRepositoryUncheckedCreateWithoutTemplatesInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    organizationUid: string
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    templateRepositoryTags?: TemplateRepositoryTagUncheckedCreateNestedManyWithoutTemplateRepositoryInput
  }

  export type TemplateRepositoryCreateOrConnectWithoutTemplatesInput = {
    where: TemplateRepositoryWhereUniqueInput
    create: XOR<TemplateRepositoryCreateWithoutTemplatesInput, TemplateRepositoryUncheckedCreateWithoutTemplatesInput>
  }

  export type TemplateUpsertWithoutChildrenInput = {
    update: XOR<TemplateUpdateWithoutChildrenInput, TemplateUncheckedUpdateWithoutChildrenInput>
    create: XOR<TemplateCreateWithoutChildrenInput, TemplateUncheckedCreateWithoutChildrenInput>
    where?: TemplateWhereInput
  }

  export type TemplateUpdateToOneWithWhereWithoutChildrenInput = {
    where?: TemplateWhereInput
    data: XOR<TemplateUpdateWithoutChildrenInput, TemplateUncheckedUpdateWithoutChildrenInput>
  }

  export type TemplateUpdateWithoutChildrenInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    parent?: TemplateUpdateOneWithoutChildrenNestedInput
    templateRepository?: TemplateRepositoryUpdateOneRequiredWithoutTemplatesNestedInput
  }

  export type TemplateUncheckedUpdateWithoutChildrenInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    parentUid?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateUpsertWithWhereUniqueWithoutParentInput = {
    where: TemplateWhereUniqueInput
    update: XOR<TemplateUpdateWithoutParentInput, TemplateUncheckedUpdateWithoutParentInput>
    create: XOR<TemplateCreateWithoutParentInput, TemplateUncheckedCreateWithoutParentInput>
  }

  export type TemplateUpdateWithWhereUniqueWithoutParentInput = {
    where: TemplateWhereUniqueInput
    data: XOR<TemplateUpdateWithoutParentInput, TemplateUncheckedUpdateWithoutParentInput>
  }

  export type TemplateUpdateManyWithWhereWithoutParentInput = {
    where: TemplateScalarWhereInput
    data: XOR<TemplateUpdateManyMutationInput, TemplateUncheckedUpdateManyWithoutParentInput>
  }

  export type TemplateRepositoryUpsertWithoutTemplatesInput = {
    update: XOR<TemplateRepositoryUpdateWithoutTemplatesInput, TemplateRepositoryUncheckedUpdateWithoutTemplatesInput>
    create: XOR<TemplateRepositoryCreateWithoutTemplatesInput, TemplateRepositoryUncheckedCreateWithoutTemplatesInput>
    where?: TemplateRepositoryWhereInput
  }

  export type TemplateRepositoryUpdateToOneWithWhereWithoutTemplatesInput = {
    where?: TemplateRepositoryWhereInput
    data: XOR<TemplateRepositoryUpdateWithoutTemplatesInput, TemplateRepositoryUncheckedUpdateWithoutTemplatesInput>
  }

  export type TemplateRepositoryUpdateWithoutTemplatesInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    organization?: OrganizationUpdateOneRequiredWithoutTemplateRepositoriesNestedInput
    templateRepositoryTags?: TemplateRepositoryTagUpdateManyWithoutTemplateRepositoryNestedInput
  }

  export type TemplateRepositoryUncheckedUpdateWithoutTemplatesInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    organizationUid?: StringFieldUpdateOperationsInput | string
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    templateRepositoryTags?: TemplateRepositoryTagUncheckedUpdateManyWithoutTemplateRepositoryNestedInput
  }

  export type TemplateRepositoryTagCreateWithoutTagInput = {
    templateRepository: TemplateRepositoryCreateNestedOneWithoutTemplateRepositoryTagsInput
  }

  export type TemplateRepositoryTagUncheckedCreateWithoutTagInput = {
    templateRepositoryUid: string
  }

  export type TemplateRepositoryTagCreateOrConnectWithoutTagInput = {
    where: TemplateRepositoryTagWhereUniqueInput
    create: XOR<TemplateRepositoryTagCreateWithoutTagInput, TemplateRepositoryTagUncheckedCreateWithoutTagInput>
  }

  export type TemplateRepositoryTagCreateManyTagInputEnvelope = {
    data: TemplateRepositoryTagCreateManyTagInput | TemplateRepositoryTagCreateManyTagInput[]
    skipDuplicates?: boolean
  }

  export type TemplateRepositoryTagUpsertWithWhereUniqueWithoutTagInput = {
    where: TemplateRepositoryTagWhereUniqueInput
    update: XOR<TemplateRepositoryTagUpdateWithoutTagInput, TemplateRepositoryTagUncheckedUpdateWithoutTagInput>
    create: XOR<TemplateRepositoryTagCreateWithoutTagInput, TemplateRepositoryTagUncheckedCreateWithoutTagInput>
  }

  export type TemplateRepositoryTagUpdateWithWhereUniqueWithoutTagInput = {
    where: TemplateRepositoryTagWhereUniqueInput
    data: XOR<TemplateRepositoryTagUpdateWithoutTagInput, TemplateRepositoryTagUncheckedUpdateWithoutTagInput>
  }

  export type TemplateRepositoryTagUpdateManyWithWhereWithoutTagInput = {
    where: TemplateRepositoryTagScalarWhereInput
    data: XOR<TemplateRepositoryTagUpdateManyMutationInput, TemplateRepositoryTagUncheckedUpdateManyWithoutTagInput>
  }

  export type TemplateRepositoryCreateWithoutTemplateRepositoryTagsInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    templates?: TemplateCreateNestedManyWithoutTemplateRepositoryInput
    organization: OrganizationCreateNestedOneWithoutTemplateRepositoriesInput
  }

  export type TemplateRepositoryUncheckedCreateWithoutTemplateRepositoryTagsInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    organizationUid: string
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
    templates?: TemplateUncheckedCreateNestedManyWithoutTemplateRepositoryInput
  }

  export type TemplateRepositoryCreateOrConnectWithoutTemplateRepositoryTagsInput = {
    where: TemplateRepositoryWhereUniqueInput
    create: XOR<TemplateRepositoryCreateWithoutTemplateRepositoryTagsInput, TemplateRepositoryUncheckedCreateWithoutTemplateRepositoryTagsInput>
  }

  export type TagCreateWithoutTemplateRepositoryTagsInput = {
    uid?: string
    name: string
    zhName?: string | null
    enName?: string | null
  }

  export type TagUncheckedCreateWithoutTemplateRepositoryTagsInput = {
    uid?: string
    name: string
    zhName?: string | null
    enName?: string | null
  }

  export type TagCreateOrConnectWithoutTemplateRepositoryTagsInput = {
    where: TagWhereUniqueInput
    create: XOR<TagCreateWithoutTemplateRepositoryTagsInput, TagUncheckedCreateWithoutTemplateRepositoryTagsInput>
  }

  export type TemplateRepositoryUpsertWithoutTemplateRepositoryTagsInput = {
    update: XOR<TemplateRepositoryUpdateWithoutTemplateRepositoryTagsInput, TemplateRepositoryUncheckedUpdateWithoutTemplateRepositoryTagsInput>
    create: XOR<TemplateRepositoryCreateWithoutTemplateRepositoryTagsInput, TemplateRepositoryUncheckedCreateWithoutTemplateRepositoryTagsInput>
    where?: TemplateRepositoryWhereInput
  }

  export type TemplateRepositoryUpdateToOneWithWhereWithoutTemplateRepositoryTagsInput = {
    where?: TemplateRepositoryWhereInput
    data: XOR<TemplateRepositoryUpdateWithoutTemplateRepositoryTagsInput, TemplateRepositoryUncheckedUpdateWithoutTemplateRepositoryTagsInput>
  }

  export type TemplateRepositoryUpdateWithoutTemplateRepositoryTagsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    templates?: TemplateUpdateManyWithoutTemplateRepositoryNestedInput
    organization?: OrganizationUpdateOneRequiredWithoutTemplateRepositoriesNestedInput
  }

  export type TemplateRepositoryUncheckedUpdateWithoutTemplateRepositoryTagsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    organizationUid?: StringFieldUpdateOperationsInput | string
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    templates?: TemplateUncheckedUpdateManyWithoutTemplateRepositoryNestedInput
  }

  export type TagUpsertWithoutTemplateRepositoryTagsInput = {
    update: XOR<TagUpdateWithoutTemplateRepositoryTagsInput, TagUncheckedUpdateWithoutTemplateRepositoryTagsInput>
    create: XOR<TagCreateWithoutTemplateRepositoryTagsInput, TagUncheckedCreateWithoutTemplateRepositoryTagsInput>
    where?: TagWhereInput
  }

  export type TagUpdateToOneWithWhereWithoutTemplateRepositoryTagsInput = {
    where?: TagWhereInput
    data: XOR<TagUpdateWithoutTemplateRepositoryTagsInput, TagUncheckedUpdateWithoutTemplateRepositoryTagsInput>
  }

  export type TagUpdateWithoutTemplateRepositoryTagsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    zhName?: NullableStringFieldUpdateOperationsInput | string | null
    enName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TagUncheckedUpdateWithoutTemplateRepositoryTagsInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    zhName?: NullableStringFieldUpdateOperationsInput | string | null
    enName?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserOrganizationCreateManyUserInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    organizationUid: string
  }

  export type UserOrganizationUpdateWithoutUserInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutUserOrganizationsNestedInput
  }

  export type UserOrganizationUncheckedUpdateWithoutUserInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organizationUid?: StringFieldUpdateOperationsInput | string
  }

  export type UserOrganizationUncheckedUpdateManyWithoutUserInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organizationUid?: StringFieldUpdateOperationsInput | string
  }

  export type UserOrganizationCreateManyOrganizationInput = {
    createdAt?: Date | string
    updatedAt?: Date | string
    userUid: string
  }

  export type TemplateRepositoryCreateManyOrganizationInput = {
    uid?: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    name: string
    description?: string | null
    kind: $Enums.TemplateRepositoryKind
    isPublic?: boolean
    iconId?: string | null
    isDeleted?: boolean | null
  }

  export type UserOrganizationUpdateWithoutOrganizationInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutUserOrganizationsNestedInput
  }

  export type UserOrganizationUncheckedUpdateWithoutOrganizationInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userUid?: StringFieldUpdateOperationsInput | string
  }

  export type UserOrganizationUncheckedUpdateManyWithoutOrganizationInput = {
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userUid?: StringFieldUpdateOperationsInput | string
  }

  export type TemplateRepositoryUpdateWithoutOrganizationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    templates?: TemplateUpdateManyWithoutTemplateRepositoryNestedInput
    templateRepositoryTags?: TemplateRepositoryTagUpdateManyWithoutTemplateRepositoryNestedInput
  }

  export type TemplateRepositoryUncheckedUpdateWithoutOrganizationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    templates?: TemplateUncheckedUpdateManyWithoutTemplateRepositoryNestedInput
    templateRepositoryTags?: TemplateRepositoryTagUncheckedUpdateManyWithoutTemplateRepositoryNestedInput
  }

  export type TemplateRepositoryUncheckedUpdateManyWithoutOrganizationInput = {
    uid?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    kind?: EnumTemplateRepositoryKindFieldUpdateOperationsInput | $Enums.TemplateRepositoryKind
    isPublic?: BoolFieldUpdateOperationsInput | boolean
    iconId?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateCreateManyTemplateRepositoryInput = {
    uid?: string
    name: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    parentUid?: string | null
    isDeleted?: boolean | null
  }

  export type TemplateRepositoryTagCreateManyTemplateRepositoryInput = {
    tagUid: string
  }

  export type TemplateUpdateWithoutTemplateRepositoryInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    parent?: TemplateUpdateOneWithoutChildrenNestedInput
    children?: TemplateUpdateManyWithoutParentNestedInput
  }

  export type TemplateUncheckedUpdateWithoutTemplateRepositoryInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    parentUid?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    children?: TemplateUncheckedUpdateManyWithoutParentNestedInput
  }

  export type TemplateUncheckedUpdateManyWithoutTemplateRepositoryInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    parentUid?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateRepositoryTagUpdateWithoutTemplateRepositoryInput = {
    tag?: TagUpdateOneRequiredWithoutTemplateRepositoryTagsNestedInput
  }

  export type TemplateRepositoryTagUncheckedUpdateWithoutTemplateRepositoryInput = {
    tagUid?: StringFieldUpdateOperationsInput | string
  }

  export type TemplateRepositoryTagUncheckedUpdateManyWithoutTemplateRepositoryInput = {
    tagUid?: StringFieldUpdateOperationsInput | string
  }

  export type TemplateCreateManyParentInput = {
    uid?: string
    name: string
    templateRepositoryUid: string
    devboxReleaseImage?: string | null
    image: string
    config: string
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    isDeleted?: boolean | null
  }

  export type TemplateUpdateWithoutParentInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    children?: TemplateUpdateManyWithoutParentNestedInput
    templateRepository?: TemplateRepositoryUpdateOneRequiredWithoutTemplatesNestedInput
  }

  export type TemplateUncheckedUpdateWithoutParentInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
    children?: TemplateUncheckedUpdateManyWithoutParentNestedInput
  }

  export type TemplateUncheckedUpdateManyWithoutParentInput = {
    uid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
    devboxReleaseImage?: NullableStringFieldUpdateOperationsInput | string | null
    image?: StringFieldUpdateOperationsInput | string
    config?: StringFieldUpdateOperationsInput | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isDeleted?: NullableBoolFieldUpdateOperationsInput | boolean | null
  }

  export type TemplateRepositoryTagCreateManyTagInput = {
    templateRepositoryUid: string
  }

  export type TemplateRepositoryTagUpdateWithoutTagInput = {
    templateRepository?: TemplateRepositoryUpdateOneRequiredWithoutTemplateRepositoryTagsNestedInput
  }

  export type TemplateRepositoryTagUncheckedUpdateWithoutTagInput = {
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
  }

  export type TemplateRepositoryTagUncheckedUpdateManyWithoutTagInput = {
    templateRepositoryUid?: StringFieldUpdateOperationsInput | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use UserCountOutputTypeDefaultArgs instead
     */
    export type UserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OrganizationCountOutputTypeDefaultArgs instead
     */
    export type OrganizationCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OrganizationCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TemplateRepositoryCountOutputTypeDefaultArgs instead
     */
    export type TemplateRepositoryCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TemplateRepositoryCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TemplateCountOutputTypeDefaultArgs instead
     */
    export type TemplateCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TemplateCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TagCountOutputTypeDefaultArgs instead
     */
    export type TagCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TagCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OrganizationDefaultArgs instead
     */
    export type OrganizationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OrganizationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserOrganizationDefaultArgs instead
     */
    export type UserOrganizationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserOrganizationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TemplateRepositoryDefaultArgs instead
     */
    export type TemplateRepositoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TemplateRepositoryDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TemplateDefaultArgs instead
     */
    export type TemplateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TemplateDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TagDefaultArgs instead
     */
    export type TagArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TagDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TemplateRepositoryTagDefaultArgs instead
     */
    export type TemplateRepositoryTagArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TemplateRepositoryTagDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}