This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 目录说明

```c
.
├── Dockerfile
├── Makefile
├── README.md
├── deploy
│   └── manifests
│       └── frontend.yaml
├── next-env.d.ts
├── next.config.js
├── package.json
├── pnpm-lock.yaml
├── public
│   ├── favicon.ico
│   ├── iconfont
│   ├── icons
│   ├── images
│   └── locales
├── src
│   ├── components
│   │   ├── account
│   │   ├── app_window
│   │   ├── background
│   │   ├── desktop_content
│   │   ├── floating_button
│   │   ├── LangSelect
│   │   ├── iconfont
│   │   ├── layout
│   │   ├── more_button
│   │   ├── notification
│   │   └── user_menu
│   ├── hooks
│   │   ├── useCopyData.ts
│   │   ├── useCustomToast.ts
│   │   ├── useRecharge.tsx
│   │   └── useScreen.ts
│   ├── pages
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── api
│   │   │   ├── account
│   │   │   ├── auth
│   │   │   ├── desktop
│   │   │   ├── notification
│   │   │   └── price
│   │   ├── index.tsx
│   │   └── login
│   ├── services
│   │   ├── backend
│   │   │   ├── auth.ts
│   │   │   ├── oauth.ts
│   │   │   ├── kubernetes
│   │   │   │   ├── admin.ts
│   │   │   │   └── user.ts
│   │   │   └── response.ts
│   │   ├── enable.ts
│   │   └── request.ts
│   ├── stores
│   │   ├── app.ts
│   │   ├── desktop.ts
│   │   └── session.ts
│   ├── styles
│   │   ├── chakraTheme.ts
│   │   └── globals.scss
│   ├── types
│   │   ├── api.ts
│   │   ├── app.ts
│   │   ├── crd.ts
│   │   ├── index.ts
│   │   ├── payment.ts
│   │   ├── user.ts
│   │   └── session.ts
│   └── utils
│       ├── crypto.ts
│       ├── ProcessManager.ts
│       ├── delay.ts
│       ├── downloadFIle.ts
│       ├── format.ts
│       ├── i18n.ts
│       └── tools.ts
└── tsconfig.json
```

### 项目依赖的库

```json
{
  "name": "desktop",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@chakra-ui/react": "^2.5.5",
    "@emotion/react": "^11.10.6",
    "@emotion/styled": "^11.10.6",
    "@kubernetes/client-node": "^0.18.1",
    "@tanstack/react-query": "^4.29.3",
    "axios": "^1.3.5",
    "clsx": "^1.2.1",
    "dayjs": "^1.11.7",
    "eslint": "8.38.0",
    "eslint-config-next": "13.3.0",
    "framer-motion": "^10.12.3",
    "i18next": "^22.4.14",
    "i18next-browser-languagedetector": "^7.0.1",
    "i18next-http-backend": "^2.2.0",
    "immer": "^10.0.1",
    "js-yaml": "^4.1.0",
    "lodash": "^4.17.21",
    "next": "13.3.0",
    "next-pwa": "^5.6.0",
    "nprogress": "^0.2.0",
    "qrcode.react": "^3.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-draggable": "^4.4.5",
    "react-i18next": "^12.2.0",
    "sass": "^1.62.0",
    "sealos-desktop-sdk": "^0.1.12",
    "typescript": "5.0.4",
    "zustand": "^4.3.7"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5",
    "@types/lodash": "^4.14.194",
    "@types/node": "18.15.11",
    "@types/nprogress": "^0.2.0",
    "@types/react": "18.0.37",
    "@types/react-dom": "18.0.11"
  }
}
```

### 代码阅读说明

1. src/pages/\_app.tsx // chakra-ui react-query
2. src/pages/index.ts
3. src/layout/index.tsx
4. src/components/desktop_content.tsx

### 测试环境

1. 需要设置环境变量`NODE_ENV=test` 或者 `$env:NODE_ENV="test"`
2. 先启动`pnpm dev`, 再启动`pnpm test:w`

### 其它

1. 获取登录凭证: 由于 login 页面不是在 desktop 项目里，所以需要从线上 sealos 获取登录凭证到本地开发: <https://cloud.sealos.io/> 。复制 storage 里的 session 到 localhost 环境实现 mock 登录。

2. Chakra ui <https://chakra-ui.com/getting-started>

3. TanStack Query 用法：<https://cangsdarm.github.io/react-query-web-i18n/react>

4. 使用 vscode 进行单步调试

   创建`.vscode/launch.json`文件,内容如下:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Next.js: debug",
         "type": "node-terminal",
         "request": "launch",
         "command": "pnpm run dev",
         "serverReadyAction": {
           "pattern": "started server on .+, url: (https?://.+)",
           "uriFormat": "%s",
           "action": "openExternally"
         }
       }
     ]
   }
   ```

   然后即可点击 vscode 的调试按钮进行调试,同时增加断点

5. 环境变量说明

- 登录功能的开关, 部署时要用`true`配置想要使用的登录方式。

  ```
  WECHAT_ENABLED=true
  GITHUB_ENABLED=true
  PASSWORD_ENABLED=true
  SMS_ENABLED=true
  RECHAGRE_ENABLED=true
  ```

- 每个登陆要配置的变量

  - wechat

    ```
    WECHAT_CLIENT_ID=
    WECHAT_CLIENT_SECRET=
    WECHAT_ENABLED="true"
    ```

  - github

    ```
    GITHUB_CLIENT_ID=
    GITHUB_CLIENT_SECRET=
    GITHUB_ENABLED="true"
    ```

  - password

    ```
    PASSWORD_SALT=
    PASSWROD_ENABLED="true"
    ```

  - sms

    ```
    ALI_ACCESS_KEY_ID=
    ALI_ACCESS_KEY_SECRET=
    ALI_SIGN_NAME=
    ALI_TEMPLATE_CODE=
    SMS_ENABLED="true"
    ```

  - google

  ```
  GOOGLE_ENABLED="true"
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  ```

  - support standard oauth2

  ```
  OAUTH2_CLIENT_ID=
  OAUTH2_CLIENT_SECRET=
  OAUTH2_AUTH_URL=
  OAUTH2_TOKEN_URL=
  OAUTH2_USERINFO_URL=
  ```

  - number of teams and number of people in each team

  ```
  // default is '50'
    TEAM_LIMIT="50"
    TEAM_INVITE_LIMIT="50"
  ```
