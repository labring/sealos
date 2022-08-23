const defaultApps = {
  apps: [
    {
      name: 'Blue',
      icon: 'win/user',
      type: 'short'
    },
    {
      name: 'Unescape',
      icon: 'unescape',
      type: 'action',
      action: 'EXTERNAL',
      payload: 'https: //blueedge.me/unescape'
    },
    {
      name: 'Recycle Bin',
      icon: 'bin0',
      type: 'app',
      size: 'full',
      hide: true,
      max: null,
      z: 0
    },
    {
      name: 'File Explorer',
      icon: 'explorer',
      type: 'app',
      action: 'EXPLORER',
      size: 'full',
      hide: true,
      max: null,
      z: 0,
      task: true
    },
    {
      name: 'Store',
      icon: 'store',
      type: 'app',
      action: 'WNSTORE',
      size: 'full',
      hide: true,
      max: null,
      z: 0,
      task: true
    },
    {
      name: 'Browser',
      icon: 'edge',
      type: 'app',
      action: 'MSEDGE',
      size: 'full',
      hide: true,
      max: null,
      z: 0,
      task: true
    },
    {
      name: 'Github',
      icon: 'github',
      type: 'app',
      action: 'EXTERNAL',
      payload: 'https: //github.com/blueedgetechno/win11React',
      size: 'full',
      hide: true,
      max: null,
      z: 0
    },
    {
      name: 'Spotify',
      icon: 'spotify',
      type: 'app',
      action: 'SPOTIFY',
      size: 'full',
      hide: true,
      max: null,
      z: 0,
      task: true
    },
    {
      name: 'Buy me a coffee',
      icon: 'buyme',
      type: 'app',
      action: 'EXTERNAL',
      payload: 'https: //www.buymeacoffee.com/blueedgetechno',
      size: 'full',
      hide: true,
      max: null,
      z: 0
    },
    {
      name: 'Python Compiler',
      icon: 'https: //upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1200px-Python-logo-notext.svg.png',
      type: 'app',
      data: {
        type: 'IFrame',
        url: 'https: //www.programiz.com/python-programming/online-compiler/',
        gallery: [
          'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
          'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
        ],
        desc: 'Compile Python'
      },
      pwa: true,
      action: 'W9676EOW',
      size: 'full',
      hide: true,
      max: null,
      z: 0
    },
    {
      name: 'Sealos',
      icon: 'https: //i.imgur.com/VfPj2Il.png',
      type: 'app',
      data: {
        type: 'IFrame',
        url: 'https: //www.sealos.io/docs/category/getting-started',
        gallery: [
          'https: //cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
          'https: //www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
        ],
        desc: 'Sealos Desktop'
      },
      pwa: true,
      action: '978OS0HK',
      size: 'full',
      hide: true,
      max: null,
      z: 0
    }
  ],
  hide: false,
  size: 1,
  sort: 'none',
  abOpen: false
};

export default defaultApps;
