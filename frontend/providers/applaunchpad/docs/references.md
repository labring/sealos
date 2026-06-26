# References

## Internal References

- `README.md`: basic project tree and provider orientation.
- `docs/architecture.md`: technical architecture notes and cross-module invariants.
- `docs/runbook.md`: verification and operational checks.
- `.workflow/duplicate-public-domain-host/`: historical planning notes for duplicate public-domain
  host handling.
- `.workflow/public-domain-conflict-attribution/`: historical planning notes for public-domain
  conflict attribution.

## External Constraints

- DNS labels are limited to 63 octets. `publicDomain` is treated as one DNS label before the
  managed suffix is appended.
- Kubernetes Ingress hosts must remain valid DNS names.
