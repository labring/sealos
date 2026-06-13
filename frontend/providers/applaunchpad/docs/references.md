# References

## Internal Source References

- `../../README.md`: workspace-level frontend setup and provider development notes.
- `package.json`: provider scripts and dependency surface.
- `src/instrumentation.ts`: development and production config loading.
- `src/utils/user.ts`: local mock kubeconfig and Desktop session fallback.
- `src/services/backend/kubernetes.ts`: Kubernetes client construction and namespace handling.
- `src/services/backend/publicDomain.ts`: public-domain validation and conflict helpers.
- `src/pages/api/v2alpha/k8sContext.ts`: v2alpha Kubernetes error conversion.
- `deploy/charts/applaunchpad-frontend/values.yaml`: chart defaults and production config assumptions.

## Local Cluster References

- Cluster 209 kubeconfig: `~/.kube/209`
- Local dev user used by the runner: `User/${APPLAUNCHPAD_DEV_USER:-admin}`; `admin` points at `ns-admin`, while `APPLAUNCHPAD_DEV_USER=<user>` can target another user namespace.
- App config source: `applaunchpad-frontend/applaunchpad-frontend-config`
- Port-forwarded services:
  - `sealos/launchpad-monitor:8428`
  - `sealos/service-vlogs:8428`
  - `account-system/account-service:2333`

## External Documentation

- Next.js pages router and standalone output documentation.
- Chakra UI component documentation.
- TanStack Query documentation.
- Kubernetes JavaScript client documentation.
- Sealos Desktop SDK and Sealos frontend workspace conventions.

Use `ctx7` for current library documentation when answering library-specific questions or changing framework/API usage.
