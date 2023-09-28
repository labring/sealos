import { headers } from "next/headers";
import { getKubeApiUrlParams } from "./util";
import { NextResponse } from "next/server";
import { SpecificKubeApiUrlParams } from "@/k8s/api/kube-api";
import { Constructor, ValueOf } from "type-fest";
import { PodApi } from "@/k8s/api/pod-api";
import { DeploymentApi } from "@/k8s/api/deployment-api";
import { StatefulSetApi } from "@/k8s/api/stateful-set";
import { EventApi } from "@/k8s/api/event-api";
import { PersistentVolumeClaimApi } from "@/k8s/api/persistent-volume-claim";
import { ConfigMapApi } from "@/k8s/api/config-map-api";
import { Resource } from "@/k8s/types/types";

export type ResourceValueKey = ValueOf<typeof Resource>;

type ApiConstructor = Constructor<any, [SpecificKubeApiUrlParams]>;

type ResourceApi = {
  [key in ResourceValueKey]: ApiConstructor;
};

const resourceApis: ResourceApi = {
  pods: PodApi,
  deployments: DeploymentApi,
  statefulsets: StatefulSetApi,
  events: EventApi,
  configmaps: ConfigMapApi,
  persistentvolumeclaims: PersistentVolumeClaimApi,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const kubeconfig = headers().get("Authorization");

  if (!kubeconfig) {
    return NextResponse.json({
      code: 401,
      message: "Unauthorized: KubeConfig not found",
    });
  }

  if (!key) {
    return NextResponse.json({
      code: 400,
      message: `Bad request: params is too few`,
    });
  }

  const api = resourceApis[key as ResourceValueKey];
  if (!api) {
    return NextResponse.json({
      code: 400,
      message: `Bad request: resource ${key} not found`,
    });
  }

  const params = getKubeApiUrlParams(decodeURIComponent(kubeconfig));
  const instance = new api(params);
  const resp = await instance.list();

  return NextResponse.json(resp);
}
