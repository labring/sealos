# Orchestration: release v5.1 provider helm configmap migration

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules
- If an env name appears in release-v5.1 manifests, keep it exactly.
- If main has a different config key or schema, ignore that content and keep only the Helm structure pattern.
- If Helm rendering changes a resource outside the four target providers, stop and narrow the chart.
- If verification fails because of unrelated pre-existing issues, record the boundary and do not hide it.

## Packet Prompts
- P1: Inventory existing env and resources.
- P2: Build charts for dbprovider/template from release manifests.
- P3: Move app env source to ConfigMap for all four charts.
- P4: Verify and close out.

## Completion Audit
- Four providers have Helm chart deployment paths.
- Existing app env names are preserved.
- Direct app env values are sourced from ConfigMaps.
- No deployment/publish/database writes were performed.
- Required closeout completed or blocked with reason.
