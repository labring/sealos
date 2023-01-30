import { TApp } from 'stores/app';
import { APPTYPE } from 'constants/app_type';

// 已安装 app
const installedApps: TApp[] = [
  {
    name: 'Sealos Document',
    icon: '/images/sealos.svg',
    type: APPTYPE.IFRAME,
    data: {
      url: 'https://www.sealos.io/docs/cloud/Intro',
      desc: 'Sealos Documents'
    },
    gallery: [
      'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize',
    menu: {
      nameColor: 'text-black',
      helpDropDown: false,
      helpDocs: false
    },
    cacheSize: 'maximize',
    mask: true,
    zIndex: 1
  },
  {
    name: 'App Store',
    icon: '/images/icons/app_store.png',
    type: APPTYPE.APP,
    data: {
      url: '',
      desc: 'App Store'
    },
    gallery: [
      'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize',
    menu: {
      nameColor: 'text-black',
      helpDropDown: false,
      helpDocs: 'https://www.sealos.io/docs/cloud/apps/appstore/'
    },
    cacheSize: 'maximize',
    mask: true,
    zIndex: 1
  },
  // {
  //   name: 'Python Compiler',
  //   icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1200px-Python-logo-notext.svg.png',
  //   type: 'iframe',
  //   data: {
  //     url: 'https://www.programiz.com/python-programming/online-compiler/',
  //     desc: 'Compile Python'
  //   },
  //   gallery: [
  //     'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize'
  // },
  // {
  //   name: 'sealos',
  //   icon: 'https://i.imgur.com/VfPj2Il.png',
  //   type: 'iframe',
  //   data: {
  //     url: '',

  //     desc: 'sealos Cloud'
  //   },
  //   gallery: [
  //     'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize'
  // },
  {
    name: 'Terminal',
    icon: '/images/terminal.svg',
    type: APPTYPE.IFRAME,
    data: {
      url: '',
      desc: 'sealos CLoud Terminal'
    },
    gallery: [
      'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize',
    menu: {
      nameColor: 'text-black',
      helpDropDown: false,
      helpDocs: 'https://www.sealos.io/docs/cloud/apps/terminal/'
    },
    cacheSize: 'maximize',
    mask: true,
    zIndex: 1
  },
  {
    name: 'Kubernetes Dashboard',
    icon: '/images/kubernetes.svg',
    type: APPTYPE.IFRAME,
    data: {
      url: '',
      desc: 'sealos Cloud Kubernetes Dashboard'
    },
    gallery: [
      'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize',
    menu: {
      nameColor: 'text-black',
      helpDropDown: true,
      helpDocs: false
    },
    cacheSize: 'maximize',
    mask: true,
    zIndex: 1
  },
  // {
  //   name: 'Kuboard',
  //   icon: '/images/kuboard.svg',
  //   type: APPTYPE.IFRAME,
  //   data: {
  //     url: '',
  //     desc: 'sealos Cloud Kuboard'
  //   },
  //   gallery: [
  //     'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize',
  //   menu: {
  //     nameColor: 'text-black',
  //     helpDropDown: true,
  //     helpDocs: false
  //   },
  //   cacheSize: 'maximize',
  //   mask: true
  // },
  // {
  //   name: 'Prometheus',
  //   icon: '/images/prometheus.svg',
  //   type: APPTYPE.IFRAME,
  //   data: {
  //     url: '',
  //     desc: 'From metrics to insight'
  //   },
  //   gallery: [
  //     'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize'
  // },
  // {
  //   name: 'Mysql',
  //   icon: '/images/mysql.svg',
  //   type: APPTYPE.IFRAME,
  //   data: {
  //     url: '',
  //     desc: 'mysql operator'
  //   },
  //   gallery: [
  //     'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize'
  // },
  // {
  //   name: 'Redis',
  //   icon: '/images/redis.svg',
  //   type: APPTYPE.IFRAME,
  //   data: {
  //     url: '',
  //     desc: 'redis operator'
  //   },
  //   gallery: [
  //     'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize',
  //   menu: {
  //     nameColor: 'text-black',
  //     helpDropDown: true,
  //     helpDocs: false
  //   },
  //   cacheSize: 'maximize',
  //   mask: true
  // },
  // {
  //   name: 'Postgres',
  //   icon: '/images/pgadmin.svg',
  //   type: APPTYPE.IFRAME,
  //   data: {
  //     url: '',
  //     desc: 'postgres operator'
  //   },
  //   gallery: [
  //     'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize',
  //   menu: {
  //     nameColor: 'text-black',
  //     helpDropDown: true,
  //     helpDocs: false
  //   }
  // },
  // {
  //   name: 'SDK-DEMO',
  //   icon: '/images/mysql.svg',
  //   type: APPTYPE.IFRAME,
  //   data: {
  //     url: 'http://localhost:3000/demo',
  //     desc: 'mysql operator'
  //   },
  //   gallery: [
  //     'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize'
  // },
  {
    name: 'sealos cloud provider',
    icon: '/images/infraicon/scp.png',
    type: APPTYPE.APP,
    data: {
      url: '',
      desc: 'infra operator'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize',
    menu: {
      nameColor: '#0073D7',
      helpDropDown: false,
      helpDocs: 'https://www.sealos.io/docs/cloud/apps/scp/'
    },
    cacheSize: 'maximize',
    mask: true,
    zIndex: 1
  },
  // {
  //   name: 'AFFiNE',
  //   icon: '/images/affine.svg',
  //   type: APPTYPE.IFRAME,
  //   data: {
  //     url: '',
  //     desc: 'AFFiNE operator'
  //   },
  //   gallery: [
  //     'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
  //     'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
  //   ],
  //   size: 'maximize',
  //   menu: {
  //     nameColor: 'text-black',
  //     helpDropDown: true,
  //     helpDocs: false
  //   },
  //   cacheSize: 'maximize',
  //   mask: true
  // },
  {
    name: 'Postgres',
    icon: '/images/pgadmin.svg',
    type: APPTYPE.APP,
    size: 'maximize',
    gallery: [
      'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    data: {
      url: '',
      desc: 'postgres operator'
    },
    cacheSize: 'maximize',
    mask: true,
    menu: {
      nameColor: 'text-black',
      helpDocs: 'https://www.sealos.io/docs/cloud/apps/postgres/',
      helpDropDown: false
    },
    zIndex: 1
  }
];

export default installedApps;
