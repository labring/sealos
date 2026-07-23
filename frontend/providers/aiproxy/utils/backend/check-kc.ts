import * as k8s from '@kubernetes/client-node'

/**
 * 从 KubeConfig 字符串中获取命名空间
 * @param configStr - KubeConfig 配置字符串
 * @returns 返回配置中的命名空间，如果解析失败则报错
 */
export function getNamespaceFromKubeConfigString(configStr: string): string {
  try {
    const kc = new k8s.KubeConfig()
    kc.loadFromString(configStr)
    return getNamespaceFromKubeConfig(kc)
  } catch (error) {
    console.error('解析 KubeConfig 字符串失败:', error)
    throw new Error('解析 KubeConfig 获取命名空间失败')
  }
}

/**
 * 从 KubeConfig 对象中获取当前上下文的命名空间
 * @param kc - KubeConfig 对象
 * @returns 返回当前上下文中设置的命名空间，如果未设置则报错"
 */
export function getNamespaceFromKubeConfig(kc: k8s.KubeConfig): string {
  try {
    // 获取当前上下文名称
    const currentContextName = kc.getCurrentContext()
    if (!currentContextName) {
      throw new Error('当前上下文名称为空')
    }

    // 从当前上下文中获取命名空间信息
    const currentContext = kc.getContextObject(currentContextName)
    if (!currentContext || !currentContext.namespace) {
      throw new Error('当前上下文没有命名空间')
    }

    return currentContext.namespace
  } catch (error) {
    console.error('获取命名空间失败:', error)
    throw new Error('获取命名空间失败')
  }
}

/**
 * 验证 KubeConfig 对象是否为本集群签发且具有配置中命名空间的权限
 * @param kc - 要验证的 KubeConfig 对象
 * @returns 返回一个布尔值，表示是否为本集群签发且具有该命名空间的权限
 */
export async function verifyK8sConfigAsync(kc: k8s.KubeConfig): Promise<boolean> {
  try {
    // 获取当前集群信息
    const cluster = kc.getCurrentCluster()
    if (!cluster) {
      return false
    }

    // 获取KubeConfig中的命名空间
    let namespace: string
    try {
      namespace = getNamespaceFromKubeConfig(kc)
    } catch (error) {
      console.error('获取命名空间失败:', error)
      return false
    }

    // 固定本集群地址
    const [inCluster, hosts] = CheckIsInCluster()
    const clusterEndpoint = inCluster && hosts ? hosts : 'https://apiserver.cluster.local:6443'

    // 创建一个用于验证的新 KubeConfig
    const verificationKc = new k8s.KubeConfig()

    // 复制原始 KubeConfig，但使用固定的集群端点
    verificationKc.clusters = [
      {
        name: cluster.name,
        caData: cluster.caData,
        caFile: cluster.caFile,
        server: clusterEndpoint,
        skipTLSVerify: cluster.skipTLSVerify,
      },
    ]
    verificationKc.users = kc.users
    verificationKc.contexts = kc.contexts
    verificationKc.setCurrentContext(kc.getCurrentContext() || '')

    // 1. 首先验证集群连接
    const k8sApi = verificationKc.makeApiClient(k8s.VersionApi)
    try {
      // 尝试获取 API 服务器版本信息
      await k8sApi.getCode()
    } catch (error) {
      console.error('验证 KubeConfig 集群连接失败:', error)
      return false
    }

    // 2. 验证对配置中指定命名空间的访问权限
    try {
      // 创建命名空间 API 客户端
      const coreV1Api = verificationKc.makeApiClient(k8s.CoreV1Api)

      // 构建请求参数对象
      const params: k8s.CoreV1ApiListNamespacedPodRequest = {
        namespace: namespace,
        limit: 1,
      }

      // 尝试获取指定命名空间中的 Pod 列表，这需要对该命名空间的 list pods 权限
      await coreV1Api.listNamespacedPod(params)

      // 如果成功获取 Pod 列表，则表示有权限访问该命名空间
      return true
    } catch (error: any) {
      if (error.code === 403) {
        console.error('用户没有命名空间 %s 的访问权限', namespace)
        return false
      }

      console.error('验证命名空间权限时出错: %s', namespace, error)
      return false
    }
  } catch (error) {
    console.error('验证过程中出错:', error)
    return false
  }
}

/**
 * 验证 KubeConfig 字符串是否为本集群签发
 * @param configStr - KubeConfig 配置字符串
 * @returns 返回一个布尔值，表示是否为本集群签发
 */
export async function verifyK8sConfigString(configStr: string): Promise<boolean> {
  try {
    const kc = new k8s.KubeConfig()
    kc.loadFromString(configStr)
    return await verifyK8sConfigAsync(kc)
  } catch (error) {
    console.error('解析 KubeConfig 字符串失败:', error)
    return false
  }
}

export function CheckIsInCluster(): [boolean, string] {
  if (
    process.env.KUBERNETES_SERVICE_HOST !== undefined &&
    process.env.KUBERNETES_SERVICE_HOST !== '' &&
    process.env.KUBERNETES_SERVICE_PORT !== undefined &&
    process.env.KUBERNETES_SERVICE_PORT !== ''
  ) {
    return [
      true,
      'https://' + process.env.KUBERNETES_SERVICE_HOST + ':' + process.env.KUBERNETES_SERVICE_PORT,
    ]
  }
  return [false, '']
}
