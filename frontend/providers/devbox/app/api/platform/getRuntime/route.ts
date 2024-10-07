import { NextRequest } from 'next/server'

import { runtimeNamespace } from '@/stores/static'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import { KBRuntimeClassType, KBRuntimeType } from '@/types/k8s'
import { VersionMapType, runtimeNamespaceMapType, ValueType } from '@/types/devbox'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const languageTypeList: ValueType[] = []
    const frameworkTypeList: ValueType[] = []
    const osTypeList: ValueType[] = []
    const languageVersionMap: VersionMapType = {}
    const frameworkVersionMap: VersionMapType = {}
    const osVersionMap: VersionMapType = {}
    const runtimeNamespaceMap: runtimeNamespaceMapType = {}

    const headerList = req.headers

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { body: runtimeClasses } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      runtimeNamespace,
      'runtimeclasses'
    )) as { body: { items: KBRuntimeClassType[] } }
    const { body: runtimes } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      runtimeNamespace,
      'runtimes'
    )) as { body: { items: KBRuntimeType[] } }

    // runtimeClasses
    const languageList = runtimeClasses?.items.filter((item: any) => item.spec.kind === 'Language')
    languageTypeList.push(
      ...languageList.map((item: any) => {
        return {
          id: item.metadata.name,
          label: item.spec.title
        }
      })
    )
    const frameworkList = runtimeClasses?.items.filter(
      (item: any) => item.spec.kind === 'Framework'
    )
    frameworkTypeList.push(
      ...frameworkList.map((item: any) => {
        return {
          id: item.metadata.name,
          label: item.spec.title
        }
      })
    )
    const osList = runtimeClasses?.items.filter((item: any) => item.spec.kind === 'OS')
    osTypeList.push(
      ...osList.map((item: any) => {
        return {
          id: item.metadata.name,
          label: item.spec.title
        }
      })
    )

    // runtimeVersions and runtimeNamespaceMap
    languageList.forEach((item: any) => {
      const language = item.metadata.name
      const versions = runtimes?.items.filter((runtime: any) => runtime.spec.classRef === language)
      languageVersionMap[language] = []
      versions.forEach((version: any) => {
        runtimeNamespaceMap[version.metadata.name] = item.metadata.namespace
        languageVersionMap[language].push({
          id: version.metadata.name,
          label: version.spec.version,
          defaultPorts: version.spec.config.appPorts.map((item: any) => item.port)
        })
      })
      if (languageVersionMap[language].length === 0) {
        delete languageVersionMap[language]
        const index = languageTypeList.findIndex((item) => item.id === language)
        if (index !== -1) {
          languageTypeList.splice(index, 1)
        }
      }
    })

    frameworkList.forEach((item: any) => {
      const framework = item.metadata.name
      const versions = runtimes?.items.filter((runtime: any) => runtime.spec.classRef === framework)
      frameworkVersionMap[framework] = []
      versions.forEach((version: any) => {
        runtimeNamespaceMap[version.metadata.name] = item.metadata.namespace
        frameworkVersionMap[framework].push({
          id: version.metadata.name,
          label: version.spec.version,
          defaultPorts: version.spec.config.appPorts.map((item: any) => item.port)
        })
      })
      if (frameworkVersionMap[framework].length === 0) {
        delete frameworkVersionMap[framework]
        const index = frameworkTypeList.findIndex((item) => item.id === framework)
        if (index !== -1) {
          frameworkTypeList.splice(index, 1)
        }
      }
    })
    osList.forEach((item: any) => {
      const os = item.metadata.name
      const versions = runtimes?.items.filter((runtime: any) => runtime.spec.classRef === os)
      osVersionMap[os] = []
      versions.forEach((version: any) => {
        runtimeNamespaceMap[version.metadata.name] = item.metadata.namespace
        osVersionMap[os].push({
          id: version.metadata.name,
          label: version.spec.version,
          defaultPorts: version.spec.config.appPorts.map((item: any) => item.port)
        })
      })
      if (osVersionMap[os].length === 0) {
        delete osVersionMap[os]
        const index = osTypeList.findIndex((item) => item.id === os)
        if (index !== -1) {
          frameworkTypeList.splice(index, 1)
        }
      }
    })
    console.log('languageVersionMap', languageVersionMap)

    return jsonRes({
      data: {
        languageVersionMap,
        frameworkVersionMap,
        osVersionMap,
        languageTypeList,
        frameworkTypeList,
        osTypeList,
        runtimeNamespaceMap
      }
    })
  } catch (error) {
    return jsonRes({
      code: 500,
      error: error
    })
  }
}
