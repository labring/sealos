Packet ID: P1
Objective: Capture release-v5.1 env variables and deployment resources for the four target providers.
Context: Current branch is release-v5.1-equivalent. Preserve current env names, defaults, and logic.
Files / sources: `frontend/providers/{template,terminal,applaunchpad,dbprovider}/deploy`, `.env.template`, and env usage in `src`.
Ownership: Read-only inventory.
Do: List env variables currently set by Kubefile/manifests/charts and note which resources must be represented in Helm.
Do not: Propose main branch config semantics.
Expected output: `results/p1-inventory.md`.
Verification: Inventory matches release files.
