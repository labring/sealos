import { TAppConfig } from 'stores/app';
import { APPTYPE } from 'constants/app_type';

// 已安装 app
const installedApps: TAppConfig[] = [
  {
    key: 'mock',
    name: 'mock',
    icon: '/images/sealos.svg',
    type: APPTYPE.IFRAME,
    gallery: [],
    data: {
      // url: 'https://deploy.cloud.sealos.io',
      url: 'http://localhost:3000',
      desc: 'deploy manager'
    },
    menuData: {
      nameColor: 'text-black',
      helpDocs: 'https://www.sealos.io/docs/cloud/Intro/',
      helpDropDown: false
    }
  }
];

export default installedApps;
