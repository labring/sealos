# sealos bytebase

## directory

```
./src
├── interfaces
│   ├── api.ts
│   ├── bytebase.ts
│   └── session.ts
├── pages
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── api
│   │   └── apply.ts
│   ├── index.module.scss
│   └── index.tsx
├── service
│   ├── auth.ts
│   ├── kubernetes.ts
│   ├── request.ts
│   └── response.ts
├── stores
│   └── session.ts
└── styles
    └── globals.scss
```

## build and push the image

```
.github/workflows/dockerize-web.yml
```
