import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { defaultEnv } from '@/stores/env';
import { runtimeNamespaceMapType, ValueType, VersionMapType } from '@/types/devbox';
import { KBRuntimeClassType, KBRuntimeType } from '@/types/k8s';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const languageTypeList: ValueType[] = [];
    const frameworkTypeList: ValueType[] = [];
    const osTypeList: ValueType[] = [];
    const languageVersionMap: VersionMapType = {};
    const frameworkVersionMap: VersionMapType = {};
    const osVersionMap: VersionMapType = {};
    const runtimeNamespaceMap: runtimeNamespaceMapType = {};

    const { ROOT_RUNTIME_NAMESPACE } = process.env;

    const headerList = req.headers;

    const { k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: runtimeClasses } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      ROOT_RUNTIME_NAMESPACE || defaultEnv.rootRuntimeNamespace,
      'runtimeclasses'
    )) as { body: { items: KBRuntimeClassType[] } };
    const { body: _runtimes } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      ROOT_RUNTIME_NAMESPACE || defaultEnv.rootRuntimeNamespace,
      'runtimes'
    )) as { body: { items: KBRuntimeType[] } };

    let runtimes = _runtimes?.items?.filter((item) => item.spec.state === 'active');

    // runtimeClasses
    const languageList = runtimeClasses?.items.filter((item: any) => item.spec.kind === 'Language');
    languageTypeList.push(
      ...languageList.map((item: any) => {
        return {
          id: item.metadata.name,
          label: item.spec.title
        };
      })
    );
    const frameworkList = runtimeClasses?.items.filter(
      (item: any) => item.spec.kind === 'Framework'
    );
    frameworkTypeList.push(
      ...frameworkList.map((item: any) => {
        return {
          id: item.metadata.name,
          label: item.spec.title
        };
      })
    );
    const osList = runtimeClasses?.items.filter((item: any) => item.spec.kind === 'OS');
    osTypeList.push(
      ...osList.map((item: any) => {
        return {
          id: item.metadata.name,
          label: item.spec.title
        };
      })
    );

    // runtimeVersions and runtimeNamespaceMap
    languageList.forEach((item: any) => {
      const language = item.metadata.name;
      const versions = runtimes.filter((runtime: any) => runtime.spec.classRef === language);
      const defaultVersion = versions.find(
        (v: any) => v.metadata.annotations?.['devbox.sealos.io/defaultVersion'] === 'true'
      );
      const otherVersions = versions.filter(
        (v: any) => v.metadata.annotations?.['devbox.sealos.io/defaultVersion'] !== 'true'
      );
      const sortedVersions = defaultVersion ? [defaultVersion, ...otherVersions] : versions;

      sortedVersions.forEach((version: any) => {
        runtimeNamespaceMap[version.metadata.name] = item.metadata.namespace;
      });

      languageVersionMap[language] = sortedVersions.map((version: any) => ({
        id: version.metadata.name,
        label: version.spec.version,
        defaultPorts: version.spec.config.appPorts.map((item: any) => item.port)
      }));
      if (languageVersionMap[language].length === 0) {
        delete languageVersionMap[language];
        const index = languageTypeList.findIndex((item) => item.id === language);
        if (index !== -1) {
          languageTypeList.splice(index, 1);
        }
      }
    });

    frameworkList.forEach((item: any) => {
      const framework = item.metadata.name;
      const versions = runtimes.filter((runtime: any) => runtime.spec.classRef === framework);
      const defaultVersion = versions.find(
        (v: any) => v.metadata.annotations?.['devbox.sealos.io/defaultVersion'] === 'true'
      );
      const otherVersions = versions.filter(
        (v: any) => v.metadata.annotations?.['devbox.sealos.io/defaultVersion'] !== 'true'
      );
      const sortedVersions = defaultVersion ? [defaultVersion, ...otherVersions] : versions;

      sortedVersions.forEach((version: any) => {
        runtimeNamespaceMap[version.metadata.name] = item.metadata.namespace;
      });

      frameworkVersionMap[framework] = sortedVersions.map((version: any) => ({
        id: version.metadata.name,
        label: version.spec.version,
        defaultPorts: version.spec.config.appPorts.map((item: any) => item.port)
      }));
      if (frameworkVersionMap[framework].length === 0) {
        delete frameworkVersionMap[framework];
        const index = frameworkTypeList.findIndex((item) => item.id === framework);
        if (index !== -1) {
          frameworkTypeList.splice(index, 1);
        }
      }
    });

    osList.forEach((item: any) => {
      const os = item.metadata.name;
      const versions = runtimes.filter((runtime: any) => runtime.spec.classRef === os);
      const defaultVersion = versions.find(
        (v: any) => v.metadata.annotations?.['devbox.sealos.io/defaultVersion'] === 'true'
      );
      const otherVersions = versions.filter(
        (v: any) => v.metadata.annotations?.['devbox.sealos.io/defaultVersion'] !== 'true'
      );
      const sortedVersions = defaultVersion ? [defaultVersion, ...otherVersions] : versions;

      sortedVersions.forEach((version: any) => {
        runtimeNamespaceMap[version.metadata.name] = item.metadata.namespace;
      });

      osVersionMap[os] = sortedVersions.map((version: any) => ({
        id: version.metadata.name,
        label: version.spec.version,
        defaultPorts: version.spec.config.appPorts.map((item: any) => item.port)
      }));
      if (osVersionMap[os].length === 0) {
        delete osVersionMap[os];
        const index = osTypeList.findIndex((item) => item.id === os);
        if (index !== -1) {
          osTypeList.splice(index, 1);
        }
      }
    });

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
    });
  } catch (error) {
    return jsonRes({
      code: 500,
      error: error
    });
  }
}
