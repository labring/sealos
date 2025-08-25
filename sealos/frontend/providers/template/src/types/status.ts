import { StatusEnum } from '@/constants/status';

export type StatusMapType = {
  label: string;
  value: `${StatusEnum}`;
  color: string;
  backgroundColor: string;
  dotColor: string;
};
