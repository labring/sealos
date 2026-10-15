# Standalone tests

Run package tests from the lifecycle module with the repository's Linux build dependencies. Integration fixtures modify hosts and must use disposable clusters.

## Mode switching and membership

Build the test binary and controller fixture, selecting GOARCH for the test host:

```sh
mkdir -p /tmp/sealos-mode-tests
GOOS=linux CGO_ENABLED=0 go test -c \
  -o /tmp/sealos-mode-tests/standalone.test ./pkg/runtime/kubernetes/standalone
docker build -f pkg/runtime/kubernetes/standalone/testdata/mode-controller.Dockerfile \
  -t sealos-mode-controller-fixture:test /tmp/sealos-mode-tests
```

Load the image and copy the binary to the disposable control plane, then run:

```sh
SEALOS_MODE_ROUNDTRIP_E2E=1 \
SEALOS_MODE_CONTROLLER_IMAGE=sealos-mode-controller-fixture:test \
./standalone.test -test.run '^TestModeRoundTripE2E$' -test.v
```

On Kubernetes v1.30, `SEALOS_MODE_UPGRADE_BINARIES` can point to official v1.31.9 kubeadm, kubelet and kubectl binaries to test upgrading before reverse conversion. For bootstrap, member addition/removal, interrupted joins and reset:

```sh
python3 pkg/runtime/kubernetes/standalone/testdata/membership-e2e.py \
  --kind /path/to/kind --sealctl /path/to/linux/sealctl \
  --controller-image sealos-mode-controller-fixture:test
```

The fixture controller tests static Pod readiness and route ownership, not CNI routing behavior.

## Worker configuration

`TestStandaloneKubeletPublicationE2E` in `pkg/runtime/kubernetes` tests publication, retry and RBAC against a real API. Set `SEALOS_STANDALONE_INIT_CONFIG_E2E_KUBECONFIG` to a disposable API's admin kubeconfig. The test requires an API with no Nodes and writes the worker ConfigMap and RBAC.

## Integration coverage

- Kubernetes v1.28.15 through v1.33.6, upgrading one minor at a time; same-version retry and preservation of newer etcd versions.
- Repeated mode switching, registered and standalone member addition/removal, route cleanup and controller updates.
- Fresh multi-master SSH installation on v1.28.15 with automatic controller credentials, worker-only Node registration, reverse conversion and registered reset/reinstallation without manual mode-state cleanup.
- Managed credentials: mutation-free preflight, least-privilege API access, master deletion/readdition and local credential cleanup.
- Native decoding of newer component fields on v1.28.15, invalid-type rejection without changing the active kubelet, and same-version upgrade after fresh install.
- Worker TLS bootstrap/Ready, kubelet configuration upgrade, etcd identity, storage bindings, Service/Pod connectivity, DNS, logs, exec and port-forward.

External etcd, etcd 3.5-to-3.6 migration and custom patch layouts still need dedicated integration testing. These results do not establish compatibility with every CNI or guarantee application availability.
