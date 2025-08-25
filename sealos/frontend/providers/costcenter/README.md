# sealos costcenter

## directory

```
./src
├── constants
│   ├── billing.ts
│   └── payment.ts
├── hooks
│   └── useRecharge.tsx
├── layout
│   ├── index.module.scss
│   ├── index.tsx
│   └── sidebar.tsx
├── mock
│   ├── billing.ts
│   └── valuation.ts
├── pages
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── api
│   │   ├── account
│   │   │   ├── getAmount.ts
│   │   │   └── payment
│   │   │       ├── index.ts
│   │   │       └── pay.ts
│   │   └── order
│   │       └── index.ts
│   ├── billing
│   │   ├── index.module.scss
│   │   └── index.tsx
│   ├── cost_overview
│   │   ├── components
│   │   │   ├── user.module.scss
│   │   │   └── user.tsx
│   │   ├── index.module.scss
│   │   └── index.tsx
│   ├── index.tsx
│   └── valuation
│       ├── index.module.scss
│       └── index.tsx
├── service
│   ├── backend
│   │   ├── auth.ts
│   │   ├── kubernetes.ts
│   │   └── response.ts
│   └── request.ts
├── stores
│   └── session.ts
├── styles
│   ├── chakraTheme.ts
│   └── globals.scss
├── types
│   ├── api.ts
│   ├── billing.ts
│   ├── crd.ts
│   ├── session.ts
│   └── valuation.ts
└── utils
    └── format.ts
```

## build and push the image

```
.github/workflows/dockerize-web.yml
```
