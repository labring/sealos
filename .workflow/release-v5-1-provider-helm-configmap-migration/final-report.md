# Final Report: release v5.1 provider helm configmap migration

## Outcome
Completed the release-v5.1 scoped provider deployment migration for:

- `frontend/providers/applaunchpad`
- `frontend/providers/terminal`
- `frontend/providers/dbprovider`
- `frontend/providers/template`

The implementation preserves release-v5.1 app env names and logic. Main branch was used only as a structural reference for Helm chart layout, entrypoint-driven `helm upgrade -i`, values files, ConfigMap-backed deployment configuration, and resource adoption.

## Accepted Results
- `dbprovider` and `template` now have Helm chart directories under `deploy/charts/*-frontend`.
- `dbprovider` and `template` Kubefiles now copy `charts` plus entrypoint scripts and run Helm instead of `kubectl apply -f manifests`.
- `applaunchpad`, `terminal`, `dbprovider`, and `template` render app env values into chart ConfigMaps.
- Deployments consume those env values via explicit `configMapKeyRef` entries so only release-v5.1 env names are injected.
- Existing release-v5.1 manifests were kept for `dbprovider` and `template` as comparison and rollback context.
- `template` ingress TLS secret remains the release-v5.1 hard-coded `wildcard-cert`.

## Rejected Results
- Did not cherry-pick the main branch PRs.
- Did not import main branch app config schemas or business config contents.
- Did not add, remove, or rename release-v5.1 app env variables.
- Did not change provider application source code.
- Did not deploy, publish images, or perform database writes.

## Conflicts Resolved
- Review found `template` chart initially used `templateConfig.certSecretName` for ingress TLS. This was corrected to release-v5.1 behavior: `secretName: wildcard-cert`.

## Verification Evidence
- `helm lint` and `helm template --debug` passed for:
  - `frontend/providers/applaunchpad/deploy/charts/applaunchpad-frontend`
  - `frontend/providers/terminal/deploy/charts/terminal-frontend`
  - `frontend/providers/dbprovider/deploy/charts/dbprovider-frontend`
  - `frontend/providers/template/deploy/charts/template-frontend`
- Rendered manifests were inspected for resource kinds and env names.
- `git diff --check` passed.
- `pnpm --filter terminal build` passed.
- `pnpm --filter dbprovider build` passed.
- `pnpm --filter dbprovider typecheck` passed.
- Workflow verification passed with `verify_workflow.py`.

Known verification failures not caused by this deployment-only change:

- `pnpm --filter applaunchpad build` failed in existing source type checking at `src/types/request_schema.ts:298`.
- `pnpm --filter template build` failed in existing Chakra dependency/module resolution under the current local install.
- Local runtime is Node `v23.11.0`, while the workspace warns that Node `20.4.0` is expected.

## Remaining Risks
- Live Helm adoption mutates existing resources with Helm labels/annotations and should be tested in a cluster before production rollout.
- The old `deploy/manifests` directories remain present for `dbprovider` and `template`; future cleanup can remove them after release-v5.1 rollout confidence is established.
- `frontend/README.md` still documents new app setup with `deploy/manifests`; that broader guide was not changed because this run only migrated four existing providers.

## Reusable Follow-up
- For future release-to-Helm provider migrations, start with an env/resource inventory from the release branch.
- Use main branch only for chart structure unless the user explicitly asks to migrate main business config content.
- Preserve env names by moving values into ConfigMap keys and using explicit `configMapKeyRef` entries instead of `envFrom`.
