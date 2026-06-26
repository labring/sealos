# Information Architecture

## User-Facing Pages

- `/`: authenticated desktop home and app launcher.
- `/signin`: sign-in page.
- `/callback`: OAuth callback handling.
- `/proxyOAuth`: OAuth proxy flow.
- `/switchRegion`: region switching surface.
- `/workspace`: workspace page entry.
- `/WorkspaceInvite`: workspace invite handling.
- `/phoneCheck` and `/emailCheck`: phone and email verification surfaces.
- `/404`: not-found page.

## Primary UI Surfaces

- Desktop shell: `src/components/desktop_content`, `src/components/AppDock`,
  `src/components/app_window`, `src/components/floating_button`.
- Account menu and settings: `src/components/account` and
  `src/components/account/AccountCenter`.
- Workspace and team management: `src/components/team`.
- Sign-in forms: `src/components/signin` and `src/components/v2`.
- Notifications and tasks: `src/components/notification`,
  `src/components/task`.
- Secondary links and regional controls: `src/components/SecondaryLinks`,
  `src/components/region`.

## API Route Groups

- `/api/auth/*`: authentication, token, namespace/workspace, profile, account
  deletion, kubeconfig, and region token routes.
- `/api/account/*`: account balance, real-name authentication, and user task
  routes.
- `/api/desktop/*`: installed apps, running apps, resource, and billing bridge.
- `/api/platform/*`: runtime cloud/common/layout/auth configuration and upload
  data.
- `/api/notification/*`: notification list and read state.

## Settings IA

Account settings start in `AccountCenter` index state and branch into password,
phone, email, real-name, OAuth binding, profile editing, and delete-account
flows. Inline reversible edits should remain inside the index state; high-risk
or multi-step flows can use modal sub-states.

## Workspace IA

Workspace switching is separate from workspace management:

- `WorkspaceToggle` and `NsListItem` let users select workspaces.
- `TeamCenter` manages the selected workspace.
- Private personal workspace surfaces use the localized default label and hide
  team-only controls.
