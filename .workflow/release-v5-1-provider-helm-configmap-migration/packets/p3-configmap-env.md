Packet ID: P3
Objective: Move direct Deployment env values to ConfigMap-backed env sources without changing env names.
Context: release-v5.1 env names and default behavior must be preserved.
Files / sources: four target provider chart templates.
Ownership: `templates/configmap.yaml` and `templates/deployment.yaml` for four target charts.
Do: Put env keys in ConfigMap data and consume them through `envFrom.configMapRef` or equivalent ConfigMap references.
Do not: Add, delete, or rename app env vars.
Expected output: Workload containers still receive the same env names, sourced from ConfigMaps.
Verification: Rendered manifests contain the expected env keys in ConfigMap and no direct env list for migrated app config values.
