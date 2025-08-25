import * as vscode from 'vscode'
import axios, {
  InternalAxiosRequestConfig,
  AxiosHeaders,
  AxiosResponse,
  AxiosRequestConfig,
} from 'axios'

import { developmentUrl, isDevelopment } from '../constant/api'
import { GlobalStateManager } from '../utils/globalStateManager'

const showStatus = (status: number) => {
  let message = ''
  switch (status) {
    case 400:
      message = 'request error(400)'
      break
    case 401:
      message = 'unauthorized, please login again(401)'
      break
    case 403:
      message = 'access denied(403)'
      break
    case 404:
      message = 'request error(404)'
      break
    case 408:
      message = 'request timeout(408)'
      break
    case 500:
      message = 'server error(500)'
      break
    case 501:
      message = 'service not implemented(501)'
      break
    case 502:
      message = 'network error(502)'
      break
    case 503:
      message = 'service unavailable(503)'
      break
    case 504:
      message = 'network timeout(504)'
      break
    case 505:
      message = 'HTTP version not supported(505)'
      break
    default:
      message = `connection error(${status})!`
  }
  return `${message}, please check the network or contact the administrator!`
}

export const updateBaseUrl = (newBaseUrl: string) => {
  request.defaults.baseURL = newBaseUrl
}

const request = axios.create({
  baseURL: isDevelopment ? developmentUrl : '.',
  withCredentials: true,
  timeout: 60000,
})

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // auto append service prefix
    if (config.url && !config.url?.startsWith('/api/')) {
      config.url = '' + config.url
    }
    let _headers: AxiosHeaders = config.headers

    const workspaceFolders = vscode.workspace.workspaceFolders

    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceFolder = workspaceFolders[0]
      const remoteUri = workspaceFolder.uri.authority
      const devboxId = remoteUri.replace(/^ssh-remote\+/, '') // devbox = sshHostLabel
      if (!_headers['Authorization']) {
        _headers['Authorization'] = encodeURIComponent(
          GlobalStateManager.getToken(devboxId) || ''
        )
      }
    }

    if (!config.headers || config.headers['Content-Type'] === '') {
      _headers['Content-Type'] = 'application/json'
    }

    config.headers = _headers
    return config
  },
  (error: any) => {
    error.data = {}
    error.data.msg = 'server error, please contact the administrator!'
    return Promise.resolve(error)
  }
)

// response interceptor
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { status, data } = response
    if (status < 200 || status >= 300) {
      return Promise.reject(
        status + ':' + showStatus(status) + ', ' + typeof data === 'string'
          ? data
          : String(data)
      )
    }

    const apiResp = data
    if (apiResp.code < 200 || apiResp.code >= 400) {
      return Promise.reject(apiResp.code + ':' + apiResp.message)
    }

    response.data = apiResp.data
    return response.data
  },
  (error: any) => {
    if (axios.isCancel(error)) {
      return Promise.reject('cancel request' + String(error))
    } else {
      error.errMessage =
        'request timeout or server error, please check the network or contact the administrator!'
    }
    return Promise.reject(error)
  }
)

export function GET<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.get(url, {
    params: data,
    ...config,
  })
}

export function POST<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.post(url, data, config)
}

export function DELETE<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.delete(url, {
    params: data,
    ...config,
  })
}
