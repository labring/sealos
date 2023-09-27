export interface AppCrdType {
  apiVersion: string;
  kind: 'App';
  metadata: {
    annotations: {
      'kubectl.kubernetes.io/last-applied-configuration': string;
    };
    creationTimestamp: string;
    generation: number;
    labels: {
      'cloud.sealos.io/deploy-on-sealos': string;
    };
    managedFields: {
      manager: string;
      operation: string;
      time: string;
    }[];
    name: string;
    namespace: string;
    resourceVersion: string;
    uid: string;
  };
  spec: {
    data: {
      url: string;
    };
    displayType: string;
    icon: string;
    menuData: {
      nameColor: string;
    };
    name: string;
    type: string;
  };
}
