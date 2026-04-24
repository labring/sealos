# Prisma Layout (No Default Entry)

To avoid accidental misuse, this repo intentionally does **not** keep:

- `prisma/schema.prisma`
- `prisma/migrations/*`

Always use an explicit schema:

- CockroachDB
  - schema: `prisma/cockroach/schema.prisma`
  - deploy: `pnpm migrate:deploy:cockroach`
- PostgreSQL
  - schema: `prisma/postgresql/schema.prisma`
  - deploy: `pnpm migrate:deploy:postgresql`

Runtime client routing is controlled by `DATABASE_PROVIDER`:

- `cockroachdb` (default)
- `postgresql`
