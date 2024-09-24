import {
  getRuntime as getRuntimeApi,
  getResourcePrice,
  getNamespace,
  getAppEnv
} from '@/api/platform'
import {
  VersionMapType,
  runtimeNamespaceMapType,
  ValueType,
  ValueTypeWithPorts
} from '@/types/devbox'
import type { Response as resourcePriceResponse } from '@/app/api/platform/resourcePrice/route'

export let SOURCE_PRICE: resourcePriceResponse = {
  cpu: 0.067,
  memory: 0.033792,
  nodeports: 0.0001
}
export let INSTALL_ACCOUNT = false
export let NAMESPACE = 'default'

let retryGetRuntimeVersion = 3
let retryGetEnv = 3
let retryGetPrice = 3
let retryGetNamespace = 3

export let SEALOS_DOMAIN = 'dev.sealos.plus'
export let INGRESS_SECRET = 'wildcard-cert'
export let REGISTRY_ADDR = 'hub.dev.sealos.plus'
export let DEVBOX_AFFINITY_ENABLE = 'true'
export let SQUASH_ENABLE = 'false'

export const runtimeNamespace = 'devbox-system'

export let languageTypeList: ValueType[] = []
export let frameworkTypeList: ValueType[] = []
export let osTypeList: ValueType[] = []

export let runtimeNamespaceMap: runtimeNamespaceMapType = {}

export let languageVersionMap: VersionMapType = {
  // [LanguageTypeEnum.java]: [{ id: '11', label: 'java-11' }],
  // [LanguageTypeEnum.go]: [{ id: '1.17', label: 'go-1.17' }],
  // [LanguageTypeEnum.python]: [{ id: '3.9', label: 'python-3.9' }],
  // [LanguageTypeEnum.node]: [{ id: '16', label: 'node-16' }],
  // [LanguageTypeEnum.rust]: [{ id: '1.55', label: 'rust-1.55' }],
  // [LanguageTypeEnum.c]: [{ id: '11', label: 'c-11' }]
}
export let frameworkVersionMap: VersionMapType = {
  // [FrameworkTypeEnum.gin]: [{ id: '1.7', label: 'gin-1.7' }],
  // [FrameworkTypeEnum.Hertz]: [{ id: '1.0', label: 'Hertz-1.0' }],
  // [FrameworkTypeEnum.springBoot]: [{ id: '2.5', label: 'spring-boot-2.5' }],
  // [FrameworkTypeEnum.flask]: [{ id: '2.0', label: 'flask-2.0' }],
  // [FrameworkTypeEnum.nextjs]: [{ id: '11', label: 'nextjs-11' }],
  // [FrameworkTypeEnum.vue]: [{ id: '3.0', label: 'vue-3.0' }]
}

export let osVersionMap: VersionMapType = {
  // [OSTypeEnum.ubuntu]: [{ id: '20.04', label: 'ubuntu-20.04' }],
  // [OSTypeEnum.centos]: [{ id: '8', label: 'centos-8' }]
}
export const getRuntimeVersionList = (runtimeType: string) => {
  let versions: ValueTypeWithPorts[] = []

  if (languageVersionMap[runtimeType]) {
    versions = languageVersionMap[runtimeType]
  } else if (frameworkVersionMap[runtimeType]) {
    versions = frameworkVersionMap[runtimeType]
  } else if (osVersionMap[runtimeType]) {
    versions = osVersionMap[runtimeType]
  }
  return versions.map((i) => ({
    value: i.id,
    label: i.label,
    defaultPorts: i.defaultPorts
  }))
}

export const getRuntimeVersionItem = (runtimeType: string, runtimeVersion: string) => {
  let versions: ValueType[] = []

  if (languageVersionMap[runtimeType]) {
    versions = languageVersionMap[runtimeType]
  } else if (frameworkVersionMap[runtimeType]) {
    versions = frameworkVersionMap[runtimeType]
  } else if (osVersionMap[runtimeType]) {
    versions = osVersionMap[runtimeType]
  }
  const version = versions.find((i) => i.id === runtimeVersion)
  const resp = `${runtimeType}-${version?.label}`

  return resp
}

export const getUserPrice = async () => {
  try {
    const res = await getResourcePrice()
    SOURCE_PRICE = res
    INSTALL_ACCOUNT = true
  } catch (err) {
    retryGetPrice--
    if (retryGetPrice >= 0) {
      setTimeout(() => {
        getUserPrice()
      }, 1000)
    }
  }
}

export const getGlobalNamespace = async () => {
  try {
    const res = await getNamespace()
    NAMESPACE = res
  } catch (err) {
    retryGetNamespace--
    if (retryGetNamespace >= 0) {
      setTimeout(() => {
        getNamespace()
      }, 1000)
    }
  }
}

export const getRuntime = async () => {
  try {
    const res = await getRuntimeApi()
    languageVersionMap = res.languageVersionMap
    frameworkVersionMap = res.frameworkVersionMap
    osVersionMap = res.osVersionMap
    languageTypeList = res.languageTypeList
    frameworkTypeList = res.frameworkTypeList
    osTypeList = res.osTypeList
    runtimeNamespaceMap = res.runtimeNamespaceMap
  } catch (err) {
    retryGetRuntimeVersion--
    if (retryGetRuntimeVersion >= 0) {
      setTimeout(() => {
        getRuntime()
      }, 1000)
    }
  }
}

export const getEnv = async () => {
  try {
    const res = await getAppEnv()
    const { domain, ingressSecret, registryAddr, devboxAffinityEnable, squashEnable } = res
    SEALOS_DOMAIN = domain
    INGRESS_SECRET = ingressSecret
    REGISTRY_ADDR = registryAddr
    DEVBOX_AFFINITY_ENABLE = devboxAffinityEnable
    SQUASH_ENABLE = squashEnable
  } catch (err) {
    retryGetEnv--
    if (retryGetEnv >= 0) {
      setTimeout(() => {
        getAppEnv()
      }, 1000)
    }
  }
}
