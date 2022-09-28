import { TApp } from 'stores/app';

const defaultApps: TApp[] = [
  {
    name: 'App Store',
    icon: '/images/icons/store.png',
    type: 'app',
    data: {
      url: 'https://www.programiz.com/python-programming/online-compiler/',
      desc: 'App Store'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  },
  {
    name: 'Python Compiler',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1200px-Python-logo-notext.svg.png',
    type: 'iframe',
    data: {
      url: 'https://www.programiz.com/python-programming/online-compiler/',
      desc: 'Compile Python'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  },
  {
    name: 'sealos',
    icon: 'https://i.imgur.com/VfPj2Il.png',
    type: 'iframe',
    data: {
      url: '',
      desc: 'sealos Cloud'
    },
    gallery: [
      'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    size: 'maximize'
  }
];

export default defaultApps;
