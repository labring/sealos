import pg, { PoolConfig, QueryConfig } from 'pg'
const { Pool, types } = pg
const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWD}@hzh.sealos.run:43243/defaultdb`

types.setTypeParser(20, function (val: string) {
  return BigInt(val)
})

let poolConfig: PoolConfig = {
  connectionString: connectionString,
  max: 20, // 连接池最大连接数
  idleTimeoutMillis: 10000, // 空闲连接超时时间，毫秒
  connectionTimeoutMillis: 2000, // 连接超时时间，毫秒
  ssl: {
    rejectUnauthorized: false // 不验证SSL证书
  }
}

export const pgPool = new Pool(poolConfig)

type UserRealNameInfo = {
  id: string
  userUid: string
  realName?: string
  idCard?: string
  phone?: string
  isVerified: boolean
  idVerifyFailedTimes: number
  createdAt: string
  updatedAt: string
  additionalInfo?: object
}

export async function validateSealosUserRealNameInfo(sealosUserUid: string): Promise<boolean> {
  const query: QueryConfig<string[]> = {
    text: 'SELECT * FROM "UserRealNameInfo" WHERE "userUid" = $1',
    values: [sealosUserUid]
  }

  try {
    const res = await pgPool.query(query)

    if (res.rows.length === 0) {
      return false
    }

    const userRealNameInfo: UserRealNameInfo = res.rows[0]

    return userRealNameInfo.isVerified
  } catch (error: any) {
    console.error('Error executing query', error.stack)
    throw error
  }
}
