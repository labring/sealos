export type EncodedKubeconfig = {
  encodedKubeconfig: string;
};

export const withEncodedKubeconfig = <T extends { kubeconfig: string }>(
  data: T
): T & EncodedKubeconfig => ({
  ...data,
  encodedKubeconfig: encodeURIComponent(data.kubeconfig)
});
