# Devbox Roadmap Notes

This file tracks practical product/engineering gaps visible from the current
provider code. It is not a release commitment.

## Near Term

- Add regression coverage for custom-domain verification feedback so dynamic DNS
  errors cannot be routed through i18n lookup again.
- Add a real package `test` script or document a project-level test command so
  automated check scripts do not fail after typecheck.
- Keep template conversion defaults explicit and reviewable for environment
  variables and ConfigMaps.

## Operational Gaps

- The current provider documentation is still lighter than the feature surface.
  Keep `docs/architecture.md`, `docs/runbook.md`, and `docs/ia.md` updated as
  future API or workflow changes land.
- ConfigMap single-file mounts use `subPath` for file shape. No-restart hot
  updates require runtime/controller-level design, not only provider UI changes.
