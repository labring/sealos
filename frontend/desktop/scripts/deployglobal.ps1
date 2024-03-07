$env:GLOBAL_DATABASE_URL = Read-Host -Prompt "get GLOBAL_DATABASE_URL"

pnpm.ps1 prisma migrate deploy --schema ./prisma/global/schema.prisma
