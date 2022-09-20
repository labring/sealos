import { TApp } from 'stores/app';

// 已安装 app
const installedApps: TApp[] = [
  {
    name: 'App Store',
    icon: '/images/icons/store.png',
    type: 'app',
    data: {
      url: '',
      desc: 'App Store'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
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
    type: 'iframe',
    data: {
      url: '',
      desc: 'sealos CLoud Terminal'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  },
  {
    name: 'Kubernetes Dashboard',
    icon: '/images/kubernetes.svg',
    type: 'iframe',
    data: {
      url: '',
      desc: 'sealos Cloud Kubernetes Dashboard'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  },
  {
    name: 'Prometheus',
    icon: '/images/prometheus.svg',
    type: 'iframe',
    data: {
      url: '',
      desc: 'From metrics to insight'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  },
  {
    name: 'Mysql',
    icon: '/images/mysql.svg',
    type: 'iframe',
    data: {
      url: '',
      desc: 'mysql operator'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  },
  {
    name: 'Redis',
    icon: '/images/redis.svg',
    type: 'iframe',
    data: {
      url: '',
      desc: 'redis operator'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  }
];

export default installedApps;
