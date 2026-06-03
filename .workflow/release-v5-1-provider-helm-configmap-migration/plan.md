# release v5.1 provider helm configmap migration

## Goal
Migrate the release-v5.1 frontend providers `template`, `terminal`, `applaunchpad`, and `dbprovider` to the Helm chart + ConfigMap deployment flow while preserving release-v5.1 environment variable names, default values, and business logic.

## Success Criteria
- The four target providers deploy through Helm charts from their `deploy/Kubefile` entrypoints.
- Existing release-v5.1 environment variables remain available in the workload containers with the same names and default meanings.
- Environment values are rendered into provider ConfigMaps and consumed from those ConfigMaps rather than hard-coded directly in Deployment env entries.
- `dbprovider` and `template` no longer rely on `kubectl apply -f manifests` for their primary deployment path.
- Helm chart rendering/linting passes for all four target providers.
- Frontend build/type checks run for touched providers where feasible.

## Current Context
- Repository root: `/Users/mlhiter/labring/sealos`.
- Frontend workspace: `/Users/mlhiter/labring/sealos/frontend`.
- Current branch: `chore/helm-chart-update`, same HEAD as `release-v5.1`.
- `applaunchpad` and `terminal` already have Helm chart scaffolding.
- `dbprovider` and `template` still use old `deploy/manifests` with env entries in the Deployment manifest.

## Constraints
- Do not use main branch business config contents as source of truth.
- Do not add, delete, or rename release-v5.1 app environment variables.
- Preserve existing default values and logic.
- No database writes.
- No production deployment or image publish unless separately requested.
- Use `linux/amd64` for any future published images, but this run should not publish images.

## Risks
- Helm adoption annotations may affect live resource takeover during deployment.
- Rendering env values through ConfigMap can subtly alter quoting/empty-string behavior.
- `applaunchpad` already has app-level config YAML; only direct env should be moved without changing its schema.

## Approval Required
- No additional approval is needed for local code edits and local verification.
- Approval is required before deployment, image publishing, database writes, or destructive git operations.

## Work Packets
- P1 inventory: capture current env variables and deployment resources for four providers.
- P2 chart migration: create Helm charts/entrypoints for `dbprovider` and `template` using release-v5.1 manifests as source.
- P3 configmap env source: convert direct Deployment env entries in all four charts to ConfigMap-backed env while preserving env names.
- P4 verification and closeout: helm lint/template, builds/type checks, workflow audit, check/neat-freak/git-commit.

## Integration Policy
- Treat release-v5.1 manifests and current chart files as authoritative for values and env names.
- Use main only for chart file shape, entrypoint deployment flow, adoption pattern, and Helm verification.
- Reject any change that imports unrelated main UI/API/config semantics.

## Verification
- `helm lint` and `helm template --debug` for four target charts.
- Provider build/typecheck commands scoped to touched apps where practical.
- `python3 /Users/mlhiter/.codex/skills/codex-dynamic-workflows/scripts/verify_workflow.py .workflow/release-v5-1-provider-helm-configmap-migration`.
- Final closeout with `check`, `neat-freak`, and `git-commit` skills per project instructions.

## Reusable Artifacts
- Keep workflow notes in this run directory for future release-to-Helm provider migrations.
