# Changelog

## 0.2.0

- Restore the SDK from the source commit of npm 0.1.0 (`382cef7f7bf3c134f08e637e36310f33562699a7`).
- Add GPU, GPU memory and Envoy request count/percentage metrics. Network queries accept service/port without a Pod and validate the Service namespace.
- Keep `disk` and accept `storage` as an alias. PVC queries no longer require a Pod.
- Synchronize application memory templates and the MySQL connections label with the Go monitor services. Accept `mysql` using the existing KubeBlocks MySQL templates.
- Fix Pod names without a dash, zero-valued instant timestamps, invalid metric handling and Prometheus errors returned with HTTP 200.
- Fix raw namespace injection for legacy `$` selectors, existing namespace matchers and quoted strings. Conflicting namespace matchers now fail instead of querying another namespace. Raw queries without explicit selectors still require caller-provided scoping; this compatibility helper is not a complete PromQL authorization boundary.
- Support `@kubernetes/client-node` 0.18 and 0.21 without modifying its prototype. Validate readiness HTTP status, preserve API server URL prefixes and bound readiness requests to 30 seconds.
- Correct CJS/ESM exports and make the build configuration independent of the monorepo TypeScript configuration. Add repository metadata and build before packing.
- Add fixture-based regression tests; default tests never load `.env` or access a real cluster. Live checks remain available with `test:integration`.
