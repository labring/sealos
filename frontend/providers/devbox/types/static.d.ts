export interface SourcePrice {
  cpu: number;
  memory: number;
  nodeports: number;
}

export interface Env {
  sealosDomain: string;
  ingressSecret: string;
  registryAddr: string;
  privacyUrl: string;
  devboxAffinityEnable: string;
  squashEnable: string;
  namespace: string;
  rootRuntimeNamespace: string;
  ingressDomain: string;
  currencySymbol: 'shellCoin' | 'cny' | 'usd';
}

export interface RuntimeTypeMap {
  id: string;
  label: string;
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
