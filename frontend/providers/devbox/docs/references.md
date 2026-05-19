# Devbox References

## Internal References

- `frontend/README.md` - frontend workspace setup.
- `frontend/providers/devbox/prisma/README.md` - Prisma schema layout.
- `frontend/providers/devbox/.env.template` - environment variable template.
- `frontend/providers/devbox/deploy/manifests/deploy.yaml.tmpl` - deployment and
  migration container shape.
- `frontend/providers/devbox/deploy/manifests/ingress.yaml.tmpl` - frontend and
  domain-challenge ingress shape.

## Issue References

- `labring-sigs/sealos-issues#171` - custom domain drawer appeared to do nothing
  when DNS validation failed. The fix maps dynamic DNS errors to stable UI copy
  and avoids sending raw DNS strings through `next-intl`.
