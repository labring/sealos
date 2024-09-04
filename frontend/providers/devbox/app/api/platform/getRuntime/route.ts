import { NextRequest } from 'next/server'

import { runtimeNamespace } from '@/stores/static'
import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const languageTypeList: any[] = []
    const frameworkTypeList: any[] = []
    const osTypeList: any[] = []
    const languageVersionMap: any = {}
    const frameworkVersionMap: any = {}
    const osVersionMap: any = {}
    const runtimeNamespaceMap: any = {}

    const headerList = req.headers

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { body: runtimeClasses }: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      runtimeNamespace,
      'runtimeclasses'
    )
    const { body: runtimes }: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      runtimeNamespace,
      'runtimes'
    )
    console.log('runtimes', runtimes)
    console.log('runtimeClasses', runtimeClasses)

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
      runtimeNamespaceMap[language] = item.metadata.namespace
      languageVersionMap[language] = []
      versions.forEach((version: any) => {
        languageVersionMap[language].push({
          id: version.metadata.name,
          label: version.spec.title
        })
      })
      if (languageVersionMap[language].length === 0) {
        delete languageVersionMap[language]
        // 从 languageTypeList 中删除对应的语言项
        const index = languageTypeList.findIndex((item) => item.id === language)
        if (index !== -1) {
          languageTypeList.splice(index, 1)
        }
      }
    })

    frameworkList.forEach((item: any) => {
      const framework = item.metadata.name
      const versions = runtimes?.items.filter((runtime: any) => runtime.spec.classRef === framework)
      runtimeNamespaceMap[framework] = item.metadata.namespace
      frameworkVersionMap[framework] = []
      versions.forEach((version: any) => {
        frameworkVersionMap[framework].push({
          id: version.metadata.name,
          label: version.spec.title
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
      runtimeNamespaceMap[os] = item.metadata.namespace
      osVersionMap[os] = []
      versions.forEach((version: any) => {
        osVersionMap[os].push({
          id: version.metadata.name,
          label: version.spec.title
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
