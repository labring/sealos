export type VirtualMachineType = {
  virtualMachineType: string;
  virtualMachinePackageFamily: string[];
};

export type CVMArchType = {
  arch: string;
  virtualMachineType: VirtualMachineType[];
};

export type CVMZoneType = {
  zone: string;
  arch: CVMArchType[];
};

export enum CVMChargeType {
  postPaidByHour = 'postPaidByHour',
  prePaid = 'prePaid'
}

export type CVMRegionType = {
  regionId: string;
  chargeType: CVMChargeType;
  regionName: string;
  zone: CVMZoneType[];
};
