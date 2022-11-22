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
};

export const imagehubLabels = [
  { label: 'All', value: 'All', checked: false },
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
  if (imageName) {
    let result = imageName.split(':');
    return { name: result[0], tag: result[1] };
  }
  return { name: '', tag: '' };
}
