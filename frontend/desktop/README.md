# Sealos Desktop Frontend

Sealos Desktop Frontend is the Next.js web desktop for Sealos Cloud. It renders
the signed-in desktop shell, workspace management, account settings, app launch
surfaces, and the API routes that bridge the browser session to global and
regional Sealos services.

## Project Docs

- [PRODUCT.md](./PRODUCT.md) describes the product context and UX principles.
- [DESIGN.md](./DESIGN.md) captures the current Chakra-based visual system.
- [ROADMAP.md](./ROADMAP.md) records near-term product priorities.
- [AGENTS.md](./AGENTS.md) records project-specific agent rules and safety notes.
- [docs/architecture.md](./docs/architecture.md) explains the main modules and data flow.
- [docs/ia.md](./docs/ia.md) maps pages, API routes, and major UI surfaces.
- [docs/runbook.md](./docs/runbook.md) lists local run, verify, deploy, and debug commands.
- [docs/references.md](./docs/references.md) collects external references used by the project.

## Getting Started

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Common verification commands:

```bash
pnpm lint
pnpm test:ci
```

When the local pnpm or Node.js version does not match this workspace, use the
checked-in binaries directly for targeted checks, for example:

```bash
./node_modules/.bin/next lint
./node_modules/.bin/jest --runInBand
```

## Source Map

- `src/pages/`: Next pages and API routes.
- `src/components/`: desktop shell, account settings, workspace/team management,
  sign-in, notifications, and app-window components.
- `src/services/backend/`: API-side auth, database, Kubernetes, middleware, and
  service helpers.
- `src/stores/`: persisted session and runtime configuration stores.
- `src/styles/`: Chakra theme overrides and global styles.
- `prisma/`: global and regional database schemas and generated clients.
- `deploy/`: Helm chart, Kubefile, and deployment entrypoint.

Use `package.json` as the source of truth for current scripts and dependencies.

### 代码阅读说明

1. `src/pages/_app.tsx`: Chakra UI and TanStack Query app bootstrap.
2. `src/pages/index.tsx`: authenticated desktop entry.
3. `src/components/desktop_content/index.tsx`: desktop background and app launch surface.
4. `src/components/account/AccountCenter/index.tsx`: account settings.
5. `src/components/team/TeamCenter.tsx`: workspace/team management.

### 安装 App 数据流

- `src/pages/api/desktop/getInstalledApps.ts` 负责组装桌面可见 App 列表。共享 App 来自 `app-system` namespace 的 `app.sealos.io/v1 App`，workspace App 来自当前 workspace namespace。
- 共享 App 保持 `displayType` 分组顺序 `normal -> more -> hidden`，组内按 `spec.position` 从小到大排序；没有 `position` 的旧数据按 `0` 处理，再按创建时间倒序和 key 稳定排序。
- `spec.position` 由管理端共享 App 图标管理写入，集群 App CRD 需要先包含 `spec.position` schema；workspace App 管理不写这个字段。

### 测试环境

1. 需要设置环境变量 `NODE_ENV=test` 或者 `$env:NODE_ENV="test"`。
2. 常用命令见 [docs/runbook.md](./docs/runbook.md)。

### 其它

1. 获取登录凭证: 由于 login 页面不是在 desktop 项目里，所以需要从线上 sealos 获取登录凭证到本地开发: <https://cloud.sealos.io/> 。复制 storage 里的 session 到 localhost 环境实现 mock 登录。

2. Chakra ui <https://v2.chakra-ui.com/getting-started>

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
