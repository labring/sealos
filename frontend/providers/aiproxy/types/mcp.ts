export interface Mcp {
  id: string
  name: string
  name_cn: string
  description: string
  description_cn: string
  hosted: boolean
}

export interface McpDetail {
  id: string
  name: string
  name_cn: string
  description: string
  description_cn: string
  hosted: boolean
  readme: string
  readme_cn: string
  endpoints: {
    host: string
    sse: string
    streamable_http: string
  }
  reusing: {
    [key: string]: {
      description: string
      name: string
      required: true
    }
  }
  params: Record<string, string>
  price: {
    default_tools_call_price: number
  }
}
