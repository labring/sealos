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

# Envs

- `ADMIN_KEY`: The admin key for the AI Proxy Service, admin key is used to admin api and relay api, default is empty
- `SEALOS_JWT_KEY`: Used to sealos balance service, default is empty
- `SQL_DSN`: The database connection string, default is empty
- `LOG_SQL_DSN`: The log database connection string, default is empty
- `REDIS_CONN_STRING`: The redis connection string, default is empty
- `BALANCE_SEALOS_CHECK_REAL_NAME_ENABLE`: Whether to check real name, default is `false`
- `BALANCE_SEALOS_NO_REAL_NAME_USED_AMOUNT_LIMIT`: The amount of used balance when the user has no real name, default is `1`
