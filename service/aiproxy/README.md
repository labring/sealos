# Use Sealos to Deploy

```bash
sealos run ghcr.io/labring/sealos-cloud-aiproxy-service:latest \
    -e ADMIN_KEY=<admin-key> \
    -e cloudDomain=<cloud-domain>
```

# Use One PostgreSQL

```bash
sealos run ghcr.io/labring/sealos-cloud-aiproxy-service:latest \
    -e ADMIN_KEY=<admin-key> \
    -e cloudDomain=<cloud-domain> \
    -e LOG_SQL_DSN=""
```
