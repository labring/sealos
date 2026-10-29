# Native deployment attribution proof

Native deployment analytics is optional and must never block the original apply operation. An authenticated Native OAuth initiator registers the complete workload proof plan **before** applying it. Registration resolves current-region Workspace membership, reads each workload with a server-owned user kubeconfig, and stores only resource identifiers, UID, generation, resourceVersion, creation time and a canonical spec hash. It stores no kubeconfig, bearer token, secret body or complete manifest.

The operation marker is a random attribution capability, not an account credential. Main passes it to the actual apply; every proof workload carries `metadata.annotations['sealos.io/acquisition-operation']`. Completion accepts no success claim. It reauthorizes the same account/region/Workspace, reads every planned workload, checks the marker, proves a new UID or real spec change, and verifies readiness of the current generation. Creation-time comparison uses Kubernetes timestamp second precision on both sides, with no extra clock-skew allowance. The marker and its otherwise-empty nested annotation containers are excluded from spec hashes. A marker-only patch, an already-ready unchanged workload, stale observedGeneration, partial plan, wrong account, revoked membership and wrong region never create deploy_success.

```mermaid
sequenceDiagram
  participant A as Native Agent
  participant M as Main (credential owner)
  participant D as Regional Desktop
  participant K as Kubernetes
  A->>M: begin (workload references)
  M->>D: register authenticated operation
  D->>K: read before snapshots
  D-->>M: scoped operation marker
  M-->>A: marker (no OAuth credential)
  A->>K: apply marked plan
  A->>M: request completion
  M->>D: complete authenticated operation
  D->>K: independently verify changes and readiness
  D->>D: unique receipts + lifecycle outbox transaction
```

Supported proof references are apps/v1 Deployment / StatefulSet, apps.kubeblocks.io/v1alpha1 Cluster and objectstorage.sealos.io/v1 ObjectStorageBucket. ConfigMaps, Secrets, Services, arbitrary CRDs and cluster-scoped resources are not proof references. Bucket status.name alone does not attest the applied generation: without an observed generation and a current Ready condition the entire operation remains pending, rather than silently dropping the bucket and counting partial success. KubeBlocks requires observedGeneration and Running phase, matching upstream v0.8/v0.9 ClusterStatus.

The request goes to the desktop authority for the **resource region**, not an unrelated fixed login region. Optional region_domain must equal that server's configured cloud domain. A global operation row binds realm, region UID, Workspace, verified initiator, immutable plan and before snapshots for thirty minutes. Reusing an operation_id with a different plan fails; replay never refreshes its baseline. The registered initiator is not claimed to be a Kubernetes audit-attested apply actor.

Every confirmed resource UID/generation has a unique durable receipt. Verification, receipt claims and the existing analytics outbox event commit in one transaction. Concurrent operations observing the same rollout cannot count it twice. Polling a pending operation is a bounded read; only an authenticated complete call admits reconciliation; a server cron can then reconcile five admitted pending operations per pass. A pre-registered operation whose App never requests completion cannot generate a conversion. No request waits for a five-minute rollout and no arbitrary sleep proves success. Expired/unverifiable operations remain inspectable; no source, consent or client success boolean is invented.

Acceptance covers new and updated complete plans, wrong markers, old Ready replay, marker-only changes, generation freshness, one non-ready member, region/owner/membership rejection, conflicting registration and receipt/outbox idempotency. Production acceptance still requires the actual cluster controllers (especially the bucket Ready schema), region RBAC and end-to-end App apply evidence.

Controller reference: [KubeBlocks v0.9 ClusterStatus](https://github.com/apecloud/kubeblocks/blob/v0.9.0/apis/apps/v1alpha1/cluster_types.go). Bucket readiness remains fail-closed until its deployed controller reports a verifiable current generation; the App status.name convention alone is insufficient.

## Optional real PostgreSQL acceptance

`native-prisma.integration.test.ts` skips its database case when `NATIVE_PROOF_DATABASE_URL` is absent. Its configuration guard accepts only a loopback host and the dedicated `native_proof_test` database/user; caller-supplied schema or host overrides are forbidden. It creates a random schema, verifies the active search path, applies only the two PostgreSQL acquisition feature migrations, and drops only that schema in `finally`.

The real Prisma test covers concurrent completion, unique UID/generation receipt claims, atomic outbox creation and rollback, replay, and a second operation proving the same resource. Kubernetes objects are injected test fixtures; this test does not replace actual controller/RBAC acceptance or contact Google.

From the Sealos repository root, these commands use fish syntax and an isolated local fixture credential:

```fish
set native_proof_container native-proof-test-(random)
docker run --name $native_proof_container --rm -d \
  -e POSTGRES_USER=native_proof_test \
  -e POSTGRES_PASSWORD=native_proof_test \
  -e POSTGRES_DB=native_proof_test \
  -p 127.0.0.1::5432 postgres:16
while not docker exec $native_proof_container pg_isready -h 127.0.0.1 -U native_proof_test -d native_proof_test >/dev/null
  sleep 0.25
end
set native_proof_port (docker port $native_proof_container 5432/tcp | string replace '127.0.0.1:' '')
env NATIVE_PROOF_DATABASE_URL="postgresql://native_proof_test:native_proof_test@127.0.0.1:$native_proof_port/native_proof_test?sslmode=disable" \
  pnpm --dir frontend/desktop exec vitest run --project unit src/__tests__/unit/backend/acquisition/native-prisma.integration.test.ts
docker rm -f $native_proof_container
```

Run the final removal command even if the test fails. It names only the temporary container created above. No production database URL, existing application container, payment service or analytics credential is used.
