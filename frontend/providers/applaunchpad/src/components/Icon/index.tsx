import React from 'react';
import type { IconProps } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/react';

export const IconMap = {
  more: require('./icons/more.svg').default,
  store: require('./icons/store.svg').default,
  configMap: require('./icons/configMap.svg').default,
  podList: require('./icons/podList.svg').default,
  arrowLeft: require('./icons/arrowLeft.svg').default,
  plus: require('./icons/plus.svg').default,
  delete: require('./icons/delete.svg').default,
  statusicon: require('./icons/statusicon.svg').default,
  restart: require('./icons/restart.svg').default,
  start: require('./icons/start.svg').default,
  pause: require('./icons/pause.svg').default,
  detail: require('./icons/detail.svg').default,
  logo: require('./icons/logo.svg').default,
  change: require('./icons/change.svg').default,
  deployMode: require('./icons/deployMode.svg').default,
  formInfo: require('./icons/formInfo.svg').default,
  network: require('./icons/network.svg').default,
  settings: require('./icons/settings.svg').default,
  edit: require('./icons/edit.svg').default,
  copy: require('./icons/copy.svg').default,
  continue: require('./icons/continue.svg').default,
  appType: require('./icons/appType.svg').default,
  listen: require('./icons/listen.svg').default,
  noEvents: require('./icons/noEvents.svg').default,
  warning: require('./icons/warning.svg').default,
  analyze: require('./icons/analyze.svg').default,
  gift: require('./icons/gift.svg').default,
  terminal: require('./icons/terminal.svg').default,
  log: require('./icons/log.svg').default,
  nvidia: require('./icons/gpu/nvidia.svg').default,
  enlarge: require('./icons/enlarge.svg').default,
  file: require('./icons/file.svg').default,
  rename: require('./icons/rename.svg').default,
  folder: require('./icons/file/folder.svg').default,
  csv: require('./icons/file/csv.svg').default,
  pdf: require('./icons/file/pdf.svg').default,
  png: require('./icons/file/png.svg').default,
  txt: require('./icons/file/txt.svg').default,
  upperRight: require('./icons/upperRight.svg').default,
  target: require('./icons/target.svg').default,
  yaml: require('./icons/file/yaml.svg').default,
  help: require('./icons/help.svg').default,
  folderLine: require('./icons/file/folder-line.svg').default,
  default: require('./icons/file/default.svg').default,
  home: require('./icons/home.svg').default,
  upload: require('./icons/upload.svg').default,
  search: require('./icons/search.svg').default,
  pods: require('./icons/pods.svg').default,
  monitor: require('./icons/monitor.svg').default,
  hardDrive: require('./icons/hardDrive.svg').default,
  download: require('./icons/download.svg').default,
  calendar: require('./icons/calendar.svg').default,
  to: require('./icons/to.svg').default,
  refresh: require('./icons/refresh.svg').default,
  container: require('./icons/container.svg').default,
  arrowRight: require('./icons/arrowRight.svg').default,
  chart: require('./icons/chart.svg').default,
  export: require('./icons/export.svg').default
};

export type IconType = keyof typeof IconMap;

const MyIcon = ({
  name,
  w = 'auto',
  h = 'auto',
  ...props
}: { name: keyof typeof IconMap } & IconProps) => {
  return IconMap[name] ? (
    <Icon
      as={IconMap[name]}
      verticalAlign={'text-top'}
      fill={'currentColor'}
      w={w}
      h={h}
      {...props}
    />
  ) : null;
};

export default MyIcon;
