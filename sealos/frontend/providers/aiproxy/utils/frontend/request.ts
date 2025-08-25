import { ApiResp } from '@/types/api'
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosRequestConfig } from 'axios'
import { getAppToken } from './user'

const request = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 60000
})

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // auto append service prefix
    if (config.url && !config.url.startsWith('/api/')) {
      config.url = `/api${config.url}`
    }

    // ensure headers exists
    config.headers = config.headers || {}

    // append user session to Authorization header
    const appToken = getAppToken()
    if (appToken) {
      config.headers['Authorization'] = appToken
    }

    // set default Content-Type
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }

    // 如果是 FormData，删除 Content-Type，让浏览器自动设置
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error: any) => {
    // handle request interceptor error
    console.error('Request Interceptor Error:', error)
    error.data = {
      msg: 'An error occurred while making the request. Please try again later.'
    }
    return Promise.reject(error) // use reject to catch error in subsequent process
  }
)

request.interceptors.response.use(
  (response: AxiosResponse) => {
    // only process status code 200
    const { data } = response.data
    return data
  },
  (error: any) => {
    if (axios.isCancel(error)) {
      return Promise.reject(new Error(`cancel request: ${error.message || error}`))
    }

    const apiResponse = error?.response?.data as ApiResp
    if (apiResponse?.error || apiResponse?.message) {
      error.message = apiResponse.error || apiResponse.message
    } else {
      error.message = 'An unknown error occurred. Please try again later.'
    }

    return Promise.reject(error)
  }
)

/**
 * GET request
 * @param url - request url
 * @param data - request params (will be converted to query string)
 * @param config - axios config
 * @returns Promise<T>
 */
export function GET<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.get(url, {
    params: data,
    ...config
  })
}

/**
 * POST request
 * @param url - request url
 * @param data - request body data
 * @param config - axios config
 * @returns Promise<T>
 */
export function POST<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.post(url, data, config)
}

/**
 * DELETE request
 * @param url - request url
 * @param data - request params (will be converted to query string)
 * @param config - axios config
 * @returns Promise<T>
 */
export function DELETE<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.delete(url, {
    params: data,
    ...config
  })
}

/**
 * PATCH request
 * @param url - request url
 * @param data - request body data
 * @param config - axios config
 * @returns Promise<T>
 */
export function PATCH<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.patch(url, data, config)
}

/**
 * PUT request
 * @param url - request url
 * @param data - request body data
 * @param config - axios config
 * @returns Promise<T>
 */
export function PUT<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.put(url, data, config)
}
