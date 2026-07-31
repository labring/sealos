# sealos app launchpad

## project tree
```bash
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
│   └── favicon.ico
├── src
│   ├── api # FE api
│   ├── components # global components
│   │   ├── AppStatusTag
│   │   ├── ButtonGroup
│   │   ├── FormControl
│   │   ├── Icon
│   │   │   ├── icons # svg icon
│   │   │   └── index.tsx
│   │   ├── PodLineChart
│   │   ├── RangeInput
│   │   ├── RangeSlider
│   │   ├── Slider
│   │   └── YamlCode
│   ├── constants # global constant data
│   │   ├── app.ts
│   │   ├── editApp.ts
│   │   └── theme.ts
│   ├── hooks # global hooks
│   │   ├── useConfirm.tsx
│   │   ├── useLoading.tsx
│   │   ├── useScreen.ts
│   │   └── useToast.ts
│   ├── mock
│   ├── pages
│   │   ├── 404.tsx
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── api # server api
│   │   ├── app
│   │   │   ├── detail
│   │   │   └── edit
│   │   └── apps
│   │       └── index.tsx
│   ├── services # server function
│   │   ├── backend
│   │   │   ├── auth.ts
│   │   │   ├── kubernetes.ts
│   │   │   └── response.ts
│   │   ├── error.ts
│   │   ├── kubernet.ts
│   │   └── request.ts
│   ├── store # FE store
│   │   ├── app.ts
│   │   ├── global.ts
│   │   └── static.ts
│   ├── styles
│   │   └── reset.scss
│   ├── types
│   │   ├── app.d.ts
│   │   ├── index.d.ts
│   │   └── user.d.ts
│   └── utils
│       ├── adapt.ts # format api data
│       ├── deployYaml2Json.ts # form data to yaml
│       ├── tools.ts
│       └── user.ts
└── tsconfig.json
```

## Template repository categories

The provider clones the template repository configured by `TEMPLATE_REPO_URL` and
`TEMPLATE_REPO_BRANCH`, then builds `templates.json` from the configured template
directory. Category menus and template category filtering prefer
`<template-repo>/config/categories.json` when that file exists. The file is a JSON
array of `{ "slug": string, "i18n": Record<string, string> }`.

`/api/updateRepo` publishes the managed category list after `templates.json` is
successfully regenerated. The generated `template-categories.json` file is a
runtime cache and should stay ignored by git. If the repository categories file is
missing or invalid, the provider falls back to `TEMPLATE_CATEGORIES`.
