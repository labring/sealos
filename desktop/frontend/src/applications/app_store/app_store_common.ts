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
};

export const ImagehubLabels = [
  // { label: 'All', value: 'All', checked: false },
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
