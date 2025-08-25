import { GET } from './index'

export const getDBList = async () => {
  const { dbList } = await GET('/api/v1/getDBSecretList')
  return dbList
}

export interface DBResponse {
  dbName: string
  dbType: string
  username: string
  password: string
  host: string
  port: number
  connection: string
}
