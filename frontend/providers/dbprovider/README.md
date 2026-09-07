# sealos app launchpad

## Deployment configuration

`dbproviderConfig.kafkaEnabled` controls whether Kafka is available in the database creation
form. It defaults to `"true"`. Set it to `"false"` in the user values file to hide Kafka while
leaving existing Kafka instances manageable:

```yaml
dbproviderConfig:
  kafkaEnabled: 'false'
```

`dbproviderConfig.dataImportEnabled` controls whether the Data Import tab appears on supported
database detail pages. It defaults to `"true"`. Set it to `"false"` in the user values file to hide
the tab and redirect direct Data Import detail views back to Overview:

```yaml
dbproviderConfig:
  dataImportEnabled: 'false'
```

`dbproviderConfig.logEnabled` controls whether the Log Analysis tab appears on supported database
detail pages. It defaults to `"false"` and is independent of `backupEnabled`:

```yaml
dbproviderConfig:
  logEnabled: 'true'
```

The installer seeds `/root/.sealos/cloud/values/apps/dataflow/dbprovider-values.yaml` from
`dbprovider-frontend-values.yaml` only when the user values file does not exist. Existing
installations must update their persisted user values explicitly. This setting does not block
Kafka creation through the database APIs, and the Data Import setting only hides the tab in the
database detail UI.

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
│   │   ├── DBStatusTag
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
