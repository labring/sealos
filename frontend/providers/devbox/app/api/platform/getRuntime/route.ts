import { headers } from 'next/headers'

import { authSession } from '@/services/backend/auth'
import { jsonRes } from '@/services/backend/response'
import { getK8s } from '@/services/backend/kubernetes'
import {
  languageVersionMap,
  frameworkVersionMap,
  osVersionMap,
  languageTypeList,
  frameworkTypeList,
  osTypeList
} from '@/stores/static'

export async function GET() {
  try {
    const headerList = headers()

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const { body: runtimeClasses }: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default',
      'runtimeclasses'
    )
    const { body: runtimes }: any = await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      'default',
      'runtimes'
    )
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
    languageList.forEach((item: any) => {
      const language = item.spec.title
      const versions = runtimes?.items.filter((runtime: any) => runtime.spec.classRef === language)
      versions.forEach((version: any) => {
        languageVersionMap[language].push({
          id: version.metadata.name,
          label: version.spec.title
        })
      })
    })
    frameworkList.forEach((item: any) => {
      const framework = item.spec.title
      const versions = runtimes?.items.filter((runtime: any) => runtime.spec.classRef === framework)
      versions.forEach((version: any) => {
        frameworkVersionMap[framework].push({
          id: version.metadata.name,
          label: version.spec.title
        })
      })
    })
    osList.forEach((item: any) => {
      const os = item.spec.title
      const versions = runtimes?.items.filter((runtime: any) => runtime.spec.classRef === os)
      versions.forEach((version: any) => {
        osVersionMap[os].push({
          id: version.metadata.name,
          label: version.spec.title
        })
      })
    })

    return jsonRes({
      data: {
        languageVersionMap,
        frameworkVersionMap,
        osVersionMap,
        languageTypeList,
        frameworkTypeList,
        osTypeList
      }
    })
  } catch (error) {
    return jsonRes({
      code: 500,
      error: error
    })
  }
}
