import { ProtocolType } from './devbox';

export interface IngressListItemType {
  name: string;
  namespace: string;
  address: string;
  port: number;
  protocol: string;
}

export type PortInfos = {
  networkName?: string;
  portName: string;
  port: number;
  protocol?: ProtocolType; //
  openPublicDomain: boolean;
  publicDomain?: string;
  customDomain?: string;
}[];
// export type PortInfos = NetworkType[]
