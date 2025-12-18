export interface SourcePrice {
  cpu: number;
  memory: number;
  nodeports: number;
  gpu: {
    alias: string;
    type: string;
    price: number;
    available: number;
    count: number;
    vm: number;
  }[];
}

export interface Env {
  documentUrlZH: string;
  documentUrlEN: string;
  privacyUrlZH: string;
  privacyUrlEN: string;
  sealosDomain: string;
  ingressSecret: string;
  registryAddr: string;
  devboxAffinityEnable: string;
  namespace: string;
  rootRuntimeNamespace: string;
  ingressDomain: string;
  currencySymbol: 'shellCoin' | 'cny' | 'usd';
  storageLimit: string;
  enableImportFeature: string;
  enableWebideFeature: string;
  cpuSlideMarkList: string;
  memorySlideMarkList: string;
}

export interface RuntimeTypeMap {
  id: string;
  label: string;
  gpu: boolean;
}

// RuntimeTypeMap
// {
//   id: 'go'
//   label: 'go'
// }

export interface RuntimeVersionMap {
  [key: string]: {
    id: string;
    label: string;
    defaultPorts: number[];
  }[];
}

// RuntimeVersionMap
// {
//   go: [
//     {
//       id: '1.17'
//       label: 'go-1.17'
//       defaultPorts: [80]
//     }
//   ]
// }

export interface RuntimeNamespaceMap {
  [key: string]: string;
}
