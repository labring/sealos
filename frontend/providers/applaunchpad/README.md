# sealos app launchpad

## Preparation, refer to the README.md in the frontend directory

## project tree

```bash
.
├── data
│   ├── form_slider_config.json  // Optional configuration files
├── deploy
├── public
│   ├── locales
│   ├── favicon.ico
│   └── logo.svg
├── src
│   ├── api
│   ├── components // Components
│   ├── constants
│   ├── hooks
│   ├── mock
│   ├── pages // Pages, the path is the route
│   │   ├── api // Server-side API
│   │   ├── app
│   │   │   ├── detail
│   │   │   │   ├── components
│   │   │   │   ├── index.module.scss
│   │   │   │   └── index.tsx // Detail page
│   │   │   └── edit
│   │   │       ├── components
│   │   │       ├── index.module.scss
│   │   │       └── index.tsx // Create and edit page
│   │   ├── apps
│   │   │   ├── components
│   │   │   ├── index.module.scss
│   │   │   └── index.tsx // App list page
│   │   ├── 404.tsx
│   │   ├── _app.tsx
│   │   └── _document.tsx
│   ├── services
│   │   ├── backend
│   │   │   ├── auth.ts
│   │   │   ├── kubernetes.ts
│   │   │   └── response.ts
│   │   ├── error.ts
│   │   ├── kubernet.ts
│   │   ├── monitorFetch.ts
│   │   ├── request.ts
│   │   └── streamFetch.ts
│   ├── store
│   ├── styles
│   ├── types
│   └── utils
├── Makefile
├── README.md
├── next-env.d.ts
├── next-i18next.config.js
├── next.config.js
├── package.json
└── tsconfig.json
```
