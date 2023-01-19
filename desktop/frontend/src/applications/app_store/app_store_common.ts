export enum EPageType {
  StorePage,
  OrganizationPage,
  MinePage,
  DetailPage
}

export type TAppStore = {
  detailAppName: string;
  toPage: (pageId: EPageType, detailAppName: string) => void;
};

export type TTag = {
  creatTime: string;
  metaName: string;
  name: string;
  checked: boolean;
  size: number;
};

export type TAppDetail = {
  ID: string;
  arch: string;
  description: string;
  docs: string;
  icon: string;
  keywords: string[];
  name: string;
  tags: TTag[];
  size: number;
  type: 'cluster-image' | 'cloud-image';
};

export const ImagehubLabels = [
  { label: 'Kubernetes', value: 'Kubernetes', checked: false },
  { label: 'Storage', value: 'Storage', checked: false },
  { label: 'Network', value: 'Network', checked: false },
  { label: 'Database', value: 'Database', checked: false },
  { label: 'Monitoring', value: 'Monitoring', checked: false },
  { label: 'Logging', value: 'Logging', checked: false },
  { label: 'Dashboard', value: 'Dashboard', checked: false },
  { label: 'MQ', value: 'MQ', checked: false },
  { label: 'Platform', value: 'Platform', checked: false }
];

export type TImageLabels = {
  label: string;
  value: string;
  checked: boolean;
};

export type TAppInfo = {
  icon: string;
  keywords: string[];
  name: string;
  description?: string;
  size: number;
};

export function handleImageName(imageName: string): { name: string; tag: string } {
  let result = imageName.split(':');
  return { name: result[0], tag: result[1] };
}

export function formattedSize(size: number, reserve: number = 1) {
  let suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
  let count = 0;
  while (size >= 1000 && count < 4) {
    size = size / 1000;
    count++;
  }
  return `${size.toFixed(reserve)}` + `${suffixes[count]}`;
}

export function getSelectLabels(labels: TImageLabels[]): string {
  return labels
    ?.map((item) => (item.checked ? 'keyword.imagehub.sealos.io/' + item.value : null))
    .filter((item) => item)
    .join(',');
}
