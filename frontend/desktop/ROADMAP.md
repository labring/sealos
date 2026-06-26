# Roadmap

## Current Priorities

- Keep account settings complete and safe: profile editing, authentication
  bindings, real-name state, and account deletion must stay consistent across UI,
  session state, and backend API guards.
- Preserve the private personal workspace contract: it is a fixed default space,
  displayed with localized copy and protected from team-only operations.
- Improve desktop configuration clarity: layout, branding, OAuth, billing, and
  feature flags should remain documented from Helm values through runtime config.
- Maintain reliable app-launch ordering and workspace context so users can
  repeatedly open apps without ambiguity.

## Near-Term Follow-Ups

- Add focused API tests around protected account deletion routes.
- Add a lightweight UI regression path for account settings and workspace
  management once the project has a stable browser test fixture.
- Reduce stale README/package drift by moving detailed command and architecture
  notes into `docs/` and keeping README as a concise entry point.

## Not In Scope For This Track

- Changing the immutable `name`/`userId` login identity when users edit their
  display nickname.
- Uploading avatar files directly from account settings. Current profile editing
  accepts an avatar URI string.
- Making the private personal workspace renameable.
