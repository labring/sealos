$env:REGION_DATABASE_URL = Read-Host -Prompt "get REGION_DATABASE_URL"

pnpm.ps1 prisma migrate deploy --schema ./prisma/region/schema.prisma
