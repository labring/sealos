# Devbox Frontend Provider

Devbox is the Sealos frontend provider for creating, editing, releasing, and
operating DevBox development environments. It is a Next.js app inside the
Sealos frontend workspace.

## How to dev

1. First,you should refer to `frontend/README.md` ’s `How to dev` part.

2. Then you should config your env.

   1. Create a new file `.env.local` in `frontend/providers/devbox`.

      > `SEALOS_DOMAIN` is anyone website you use in sealos.

   2. ```
      NEXT_PUBLIC_MOCK_USER=""
      SEALOS_DOMAIN="bja.sealos.run"
      NODE_ENV="development"
      ```

   3. Then we should get our `NEXT_PUBLIC_MOCK_USER`

   4. go to `bja.sealos.run` and login (firstly you goto this website,sign up,so go on.)

   5. Refer this picture,you should open `Console-application`，and get your own `session.state.session.kubeconfig`,copy as JSON string.

      ![image-20240423105724369](https://raw.githubusercontent.com/mlhiter/typora-images/master/202404231101028.png)

3. After that,have your own `test 3000 `page

   > Why you should have that?
   >
   > If you open your own dev in `localhost:3000` directly,you cannot have sealos desktop border,which maybe influence your style.

   1. This url：[website](https://cloud.sealos.run/?openapp=system-template%3FtemplateName%3Done-step-shortcuts)

   2. ![image-20240423111024336](https://raw.githubusercontent.com/mlhiter/typora-images/master/202404231110609.png)

   3. Refresh website.

   4. Then you can get your own dev in this.

      ![image-20240423111123308](https://raw.githubusercontent.com/mlhiter/typora-images/master/202404231111720.png)

## Useful commands

```bash
pnpm dev
pnpm build
pnpm ts-lint
pnpm gen-client
```

This workspace does not currently define a `test` script. Use `pnpm ts-lint` as
the focused typecheck until a real test command is added.

## More docs

- `AGENT.md` - agent operating notes for this provider.
- `docs/architecture.md` - module boundaries and request flow.
- `docs/runbook.md` - local verification and 70-cluster deployment notes.
- `docs/ia.md` - main pages and API route surfaces.
- `prisma/README.md` - Prisma schema and migration layout.
