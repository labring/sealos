# Certificates

This directory contains certificates for Docker Registry token authentication.

## Generate Certificates

```bash
# Generate private key
openssl genrsa -out token.key 2048

# Generate self-signed certificate (valid for 1 year)
openssl req -new -x509 -key token.key -out token.crt -days 365 \
  -subj "/CN=rauth/O=rauth/C=US"
```

## Files

- `token.key` - Private key for signing JWT tokens (keep secret!)
- `token.crt` - Public certificate for registry to verify tokens

**Note:** These files are ignored by git. Generate them locally for testing.
