import {
  KubeJsonApiDataFor,
  KubeObject,
  KubeObjectConstructor,
  isJsonApiDataList,
  isPartialJsonApiData,
} from "@/k8slens/kube-object";
import { isArray, startCase } from "lodash";
import { isDefined } from "@/k8slens/utilities";
import { KubeObjectConstructorMap, Resource } from "@/k8s/types/types";

const kubeconfig = process.env.NEXT_PUBLIC_MOCK_USER!;

const getKubeConfig = () => {
  let kubeConfig: string =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_MOCK_USER || ""
      : "";

  try {
    const store = localStorage.getItem("session");
    if (!kubeConfig && store) {
      kubeConfig = JSON.parse(store)?.kubeconfig;
    }
  } catch (err) {
    err;
  }
  return kubeConfig;
};

export const getResource = async <Object extends KubeObject = KubeObject>(
  resource: Resource
): Promise<Object[]> => {
  try {
    const res = await fetch(
      `http://localhost:3000/api/resource?key=${resource}`,
      {
        method: "GET",
        headers: {
          Authorization: encodeURIComponent(getKubeConfig()),
        },
        cache: "no-cache",
      }
    ).then((res) => res.json());

    if (res.code !== 200) {
      return Promise.reject(new Error(res.message));
    }

    const parsed = parseResponse(
      res.data,
      startCase(resource),
      KubeObjectConstructorMap[resource]
    ) as Object[] | null;

    if (isArray(parsed)) {
      return parsed;
    }

    if (!parsed) return [];

    return Promise.reject(
      new Error(
        `GET multiple request to ${resource} returned not an array: ${JSON.stringify(
          parsed
        )}`
      )
    );
  } catch (err) {
    return Promise.reject(err);
  }
};

const parseResponse = <
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>
>(
  data: unknown,
  kind: string,
  objectConstructor: KubeObjectConstructor<Object, Data>
): Object[] | null => {
  if (!data) {
    return null;
  }

  const KubeObjectConstructor = objectConstructor;

  if (isJsonApiDataList(data, isPartialJsonApiData)) {
    const { apiVersion, items } = data;

    return items
      .map((item) => {
        if (!item.metadata) {
          return undefined;
        }

        const object = new KubeObjectConstructor({
          ...(item as Data),
          kind: kind,
          apiVersion,
        });
        return object;
      })
      .filter(isDefined);
  }

  return null;
};
