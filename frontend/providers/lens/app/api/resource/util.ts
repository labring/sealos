import { SpecificKubeApiUrlParams } from "@/k8s/api/kube-api";
import { env } from "process";
import { KubeConfig, Cluster } from "@kubernetes/client-node";

export const getKubeApiUrlParams = (
  kubeconfig: string
): SpecificKubeApiUrlParams => {
  const kc = createKc(kubeconfig);
  const user = kc.getCurrentUser();
  if (!user) throw new Error("Current user not found");
  const namespace = `ns-${user.name}`;

  const cluster = kc.getCurrentCluster();
  if (!cluster) throw new Error("Current cluster not found");

  const opts = {
    url: "",
    json: true,
    headers: {
      Accept: "application/json",
    },
    useQuerystring: false,
  };
  kc.applyToRequest(opts);

  return {
    serverUrl: cluster.server,
    namespace: namespace,
    requestOpts: opts,
  };
};

const checkIsInCluster = (): [boolean, string] => {
  if (
    env.KUBERNETES_SERVICE_HOST !== undefined &&
    env.KUBERNETES_SERVICE_HOST !== "" &&
    env.KUBERNETES_SERVICE_PORT !== undefined &&
    env.KUBERNETES_SERVICE_PORT !== ""
  ) {
    return [
      true,
      "https://" +
        process.env.KUBERNETES_SERVICE_HOST +
        ":" +
        process.env.KUBERNETES_SERVICE_PORT,
    ];
  }
  return [false, ""];
};

const createKc = (kubeconfig: string): KubeConfig => {
  const kc = new KubeConfig();
  kc.loadFromString(kubeconfig);

  const cluster = kc.getCurrentCluster();
  if (cluster) {
    const [inCluster, hosts] = checkIsInCluster();

    const server: Cluster = {
      name: cluster.name,
      caData: cluster.caData,
      caFile: cluster.caFile,
      server:
        inCluster && hosts ? hosts : "https://apiserver.cluster.local:6443",
      skipTLSVerify: cluster.skipTLSVerify,
    };

    kc.clusters.forEach((item, i) => {
      if (item.name === cluster.name) {
        kc.clusters[i] = server;
      }
    });
  }
  return kc;
};
