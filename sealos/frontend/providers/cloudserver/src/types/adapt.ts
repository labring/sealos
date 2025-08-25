import { CVMInstanceType, PhaseEnum, StateEnum } from './cloudserver';

export default function adaptCloudServerListItem(item: CVMInstanceType): CVMInstanceType {
  const status =
    item.state === StateEnum.Changing
      ? PhaseEnum.Changing
      : item.state === StateEnum.Restarting
      ? PhaseEnum.Restarting
      : item.phase;

  return {
    ...item,
    phase: status
  };
}
