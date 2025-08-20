# Shadcn/ui for Sealos frontend apps

## Getting started (for Next.js apps)

### Install dependencies

```sh
# Tailwind CSS and PostCSS
pnpm install tailwindcss @tailwindcss/postcss postcss

# RHF (for `Form` component), Sonner (for `Sonner` component)
pnpm install react-hook-form sonner
```

```jsonc
// package.json
{
  //...
  "dependencies": {
    // ...
    "@sealos/shadcn-ui": "workspace:^" // <== Add this
  }
}
```

### Add PostCSS config file

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
};
```

### Import Tailwind CSS and UI styles

Import this file in your root layout / app root component.

```css
/* global.css */

/* Tailwind CSS, default theme, common utilities/components and required plugins */
@import '@sealos/shadcn-ui/shadcn.css';

/* UI components search path */
@import '@sealos/shadcn-ui/styles.css';

/* theme override, plugins, utilities, other styles, etc. */
/* ... */
```

## Usage

### Import path

```js
// Both are recommended import styles
import { Button } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
```

### `cn` utility

```js
// Easier tailwind-merge and clsx
import { cn } from '@sealos/shadcn-ui';
```

## Developing this package

### Adding a component/hook using shadcn CLI

See: [shadcn/ui document](https://ui.shadcn.com/docs/cli)
