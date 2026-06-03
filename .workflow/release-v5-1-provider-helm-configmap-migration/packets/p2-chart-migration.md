Packet ID: P2
Objective: Create Helm chart deployment paths for dbprovider and template.
Context: Existing manifests are source of truth. Main branch is only a structural reference for chart layout and entrypoint flow.
Files / sources: `frontend/providers/dbprovider/deploy`, `frontend/providers/template/deploy`.
Ownership: Deployment files under those two provider deploy directories.
Do: Add chart files, default values files, entrypoint scripts, and update Kubefile to copy charts and run Helm.
Do not: Change app business code or env names.
Expected output: Helm charts that render the old resources.
Verification: `helm template` renders Namespace/ConfigMap/Deployment/Service/Ingress/App/RBAC as applicable.
