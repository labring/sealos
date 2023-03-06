# Image Hub

https://www.sealos.io/docs/cloud/apps/appstore/

## 目录说明

```
.
├── public
│   ├── favicon.ico
│   ├── iconfont
│   └── images
├── src
│   ├── components
│   │   ├── button
│   │   ├── error
│   │   ├── iconfont
│   │   ├── labels
│   │   ├── markdown
│   │   └── pgination
│   ├── interfaces
│   │   ├── api.ts
│   │   ├── imagehub.ts
│   │   └── session.ts
│   ├── layout
│   │   ├── index.module.scss
│   │   └── index.tsx
│   ├── mock
│   │   └── imagehub.ts
│   ├── pages
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── api
│   │   │   ├── get_detail.ts
│   │   │   └── get_list.ts
│   │   ├── detail.module.scss
│   │   ├── detail.tsx
│   │   ├── index.module.scss
│   │   ├── index.tsx
│   │   ├── store.module.scss
│   │   └── store.tsx
│   ├── services
│   │   ├── kubernetes.ts
│   │   ├── request.ts
│   │   ├── response.ts
│   │   └── wrapper.ts
│   ├── stores
│   │   └── session.ts
│   ├── styles
│   │   └── globals.scss
│   └── utils
│       └── strings.ts
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 项目依赖的库

```
{
  "name": "imagehub",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@ctrl/golang-template": "^1.4.1",
    "@kubernetes/client-node": "0.18.0",
    "@next/font": "13.1.1",
    "@tanstack/react-query": "^4.20.4",
    "axios": "1.2.1",
    "clsx": "^1.2.1",
    "eslint": "8.33.0",
    "eslint-config-next": "13.1.0",
    "github-markdown-css": "^5.1.0",
    "immer": "^9.0.16",
    "js-yaml": "^4.1.0", // js and yaml conversions
    "lodash": "^4.17.21",
    "next": "13.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-markdown": "^8.0.4", // Markdown
    "react-syntax-highlighter": "^15.5.0", // Code highlighting
    "sealos-desktop-sdk": "^0.1.8", // Communicate sdk with desktop
    "ts-md5": "^1.3.1",
    "zustand": "^4.1.5" // State management
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5",
    "@types/lodash": "^4.14.191",
    "@types/node": "18.11.19",
    "@types/react": "18.0.27",
    "@types/react-dom": "18.0.10",
    "@types/react-syntax-highlighter": "^15.5.6",
    "autoprefixer": "^10.4.13",
    "postcss": "^8.4.21",
    "sass": "^1.57.1",
    "tailwindcss": "^3.2.4",
    "typescript": "4.9.5"
  }
}
```
