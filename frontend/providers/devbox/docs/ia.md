# Devbox Information Architecture

## Primary Pages

- `/[lang]` - DevBox list/home page.
- `/[lang]/devbox/create` - create form.
- `/[lang]/devbox/create?name=<devbox>&scrollTo=network` - edit form focused on
  network configuration.
- `/[lang]/devbox/detail/[name]` - DevBox detail page.
- `/[lang]/template` - template management page.
- `/api-docs` - API docs surface.
- `/api/v2alpha/docs` - v2alpha API docs surface.

## Main User Flows

- List DevBoxes -> create DevBox -> open IDE.
- Detail page -> manage network -> edit form -> custom domain drawer -> submit
  outer update.
- Detail page -> release -> deploy app.
- Detail page/template UI -> convert or update template.
- Import from Git or local archive when import features are enabled.

## Major API Groups

- DevBox CRUD and lifecycle: `getDevboxList`, `getDevboxByName`,
  `createDevbox`, `updateDevbox`, `startDevbox`, `shutdownDevbox`,
  `restartDevbox`, `delDevbox`.
- Network and access: `getDevboxPorts`, `updateDevboxWebIDEPort`,
  `platform/authCname`, `platform/authDomainChallenge`, `checkReady`.
- Release and deployment: `releaseDevbox`, `releaseAndDeployDevbox`,
  `deployDevbox`.
- Templates: `templateRepository/*`.
- Platform support: `platform/getQuota`, `platform/getDebt`,
  `platform/resourcePrice`, guide routes, monitor routes, OpenAPI routes.

## Navigation Notes

The detail page network card has a `manage` action that routes to the create/edit
page with `scrollTo=network`. Network edits are made in the form page, not inside
the detail card itself.
