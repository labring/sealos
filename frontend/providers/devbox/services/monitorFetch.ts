import { AxiosRequestConfig } from 'axios'

export const monitorFetch = async (props: AxiosRequestConfig, kubeconfig: string) => {
  const { url, params } = props
  const queryString = typeof params === 'object' ? new URLSearchParams(params).toString() : params
  const requestOptions = {
    method: 'GET',
    headers: {
      Authorization: encodeURIComponent(kubeconfig)
    }
  }

  let doMain = ''
  if (process.env.NODE_ENV === 'development') {
    doMain = 'http://devbox.usw.sailos.io:31798'
  } else {
    doMain = 'http://launchpad-monitor.sealos.svc.cluster.local:8428'
  }

  try {
    const response = await fetch(`${doMain}${url}?${queryString}`, requestOptions)

    if (!response.ok) {
      throw new Error(`Error monitorFetch ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    throw error
  }
}
