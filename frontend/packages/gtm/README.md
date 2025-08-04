# @sealos/gtm

Google Tag Manager integration for Sealos applications with full TypeScript support.

## Features

- 🎯 **Simple API**: Vercel Analytics-style `track()` function
- 📝 **TypeScript**: Complete type safety with Sealos GTM event schema
- ⚡ **Fast Setup**: Support for both Pages Router and App Router
- 🔧 **Flexible**: Use predefined events or custom tracking
- 🐛 **Debug Mode**: Built-in debugging for development

## Installation

```bash
pnpm add @sealos/gtm
```

## Quick Start

### 1. Simple Setup (Recommended)

Add GTM component to your `_app.tsx`:

```tsx
// pages/_app.tsx
import { GTMScript } from '@sealos/gtm';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <GTMScript
        gtmId={process.env.NEXT_PUBLIC_GTM_ID!}
        enabled={!!process.env.NEXT_PUBLIC_GTM_ID}
        debug={process.env.NODE_ENV === 'development'}
      />
      <Component {...pageProps} />
    </>
  );
}
```

### 2. App Router

```tsx
// app/layout.tsx
import { GTMScript } from '@sealos/gtm';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <GTMScript
          gtmId={process.env.NEXT_PUBLIC_GTM_ID!}
          enabled={!!process.env.NEXT_PUBLIC_GTM_ID}
          debug={process.env.NODE_ENV === 'development'}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Advanced Setup (via \_document.tsx)

If you need more control, configure in `_document.tsx`:

```tsx
// pages/_document.tsx
import { getGTMScripts, getDataLayerScript } from '@sealos/gtm';
import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);

    const gtmConfig = getGTMScripts({
      gtmId: process.env.NEXT_PUBLIC_GTM_ID || '',
      enabled: !!process.env.NEXT_PUBLIC_GTM_ID,
      debug: process.env.NODE_ENV === 'development'
    });

    return {
      ...initialProps,
      scripts: [...(scripts || []), ...gtmConfig.scripts],
      noscripts: [...(noscripts || []), ...gtmConfig.noscripts]
    };
  }

  render() {
    const { scripts = [], noscripts = [] } = this.props;

    return (
      <Html lang="en">
        <Head>
          <script dangerouslySetInnerHTML={{ __html: getDataLayerScript() }} />
          {scripts?.map((item, i) => (
            <Script key={i} {...item} />
          ))}
        </Head>
        <body>
          {noscripts?.map((item, i) => (
            <noscript key={i} {...item} />
          ))}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

### 4. Environment Variables

```env
# .env.local
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

## Usage

### Simple Tracking (Vercel Analytics Style)

```tsx
import { track } from '@sealos/gtm';

// Simple event tracking
track('module_open', { module: 'devbox' });

// Complex event tracking
track('deployment_create', {
  module: 'devbox',
  config: { template_name: 'php' },
  resources: { cpu_cores: 1, ram_mb: 1024 }
});
```

### All Event Types

```tsx
import { track } from '@sealos/gtm';

// Module events
track('module_open', { module: 'devbox' });
track('module_view', { module: 'applaunchpad', view_name: 'logs' });

// Deployment events
track('deployment_start', { module: 'devbox' });
track('deployment_create', {
  module: 'devbox',
  config: { template_name: 'php', template_version: '7.4' },
  resources: { cpu_cores: 1, ram_mb: 1024 }
});

// App launch
track('app_launch', {
  module: 'desktop',
  app_name: 'wordpress',
  source: 'appstore'
});

// Auth events
track('login_start', { module: 'auth' });
track('login_success', {
  module: 'auth',
  method: 'oauth2',
  oauth2_provider: 'google',
  user_type: 'new'
});

// Workspace events
track('workspace_create', { module: 'workspace' });
track('workspace_invite', { module: 'workspace', invite_role: 'developer' });

// Error tracking
track('error_occurred', { module: 'devbox', error_code: 'NAME_ALREADY_IN_USE' });
```

### TypeScript Support

```tsx
import { track, GTMEvent, DeploymentCreateEvent } from '@sealos/gtm';

// Type-safe event tracking
const event: DeploymentCreateEvent = {
  event: 'deployment_create',
  context: 'app',
  module: 'devbox',
  config: { template_name: 'php' }
};

track(event);
```

### Configuration

```tsx
import { configureGTM } from '@sealos/gtm';

// Configure debugging and enable/disable tracking
configureGTM({
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development'
});
```

## Supported Events

### Module Events

- `module_open` - When a module is opened
- `module_view` - When navigating within a module

### App Events

- `app_launch` - When launching apps from desktop

### Deployment Events

- `deployment_start` - Starting a deployment
- `deployment_create` - Deployment completed
- `deployment_update` - Updating a deployment
- `deployment_delete` - Deleting a deployment
- `deployment_shutdown` - Shutting down a deployment
- `deployment_details` - Viewing deployment details

### Workspace Events

- `workspace_create` - Creating a workspace
- `workspace_delete` - Deleting a workspace
- `workspace_switch` - Switching workspaces
- `workspace_invite` - Inviting members
- `workspace_join` - Joining via invite

### Guide Events

- `guide_start` - Starting a guide
- `guide_complete` - Completing a guide
- `guide_exit` - Exiting a guide

### Other Events

- `ide_open` - Opening IDE
- `release_create` - Creating a release
- `error_occurred` - Error tracking
- `paywall_triggered` - Paywall events
- `announcement_click` - Announcement interactions

## Module Support

All Sealos modules are supported:

- `desktop`, `devbox`, `database`, `applaunchpad`
- `appstore`, `costcenter`, `workspace`, `guide`
- `aiproxy`, `kubepanel`, `objectstorage`, `cronjob`, `terminal`

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Clean build files
pnpm clean
```

## License

MIT
