# Copyright © 2022 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
FROM node:20.4.0-alpine As base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat && corepack enable && corepack prepare pnpm@8.9.0 --activate


# Install dependencies based on the preferred package manager root workspace
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  [ -f pnpm-lock.yaml ] && pnpm fetch || \
  (echo "Lockfile not found." && exit 1) 
COPY ./tsconfig.json ./tsconfig.json
COPY ./tsconfig.deps.json ./tsconfig.deps.json
COPY ./tsconfig.base.json ./tsconfig.base.json
COPY ./tsconfig.web.json ./tsconfig.web.json
COPY ./packages ./packages

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
pnpm -r --offline --filter=./packages/* install \
&& pnpm -r --filter=./packages/* run build 

FROM deps AS builder

# COPY --from=deps /app/node_modules ./node_modules
# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# COPY --from=deps /app/packages ./packages

ARG name
ARG path

COPY ${path} ${path}

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --frozen-lockfile --filter=$name install && pnpm --filter=$name run build
RUN if [ "$name" = "desktop" ]; then \
    cp -r ./desktop/prisma/global/migrations desktop/.next/standalone/desktop/prisma/global/migrations; \
    cp -r ./desktop/prisma/region/migrations desktop/.next/standalone/desktop/prisma/region/migrations; \
fi
# Production image, copy all the files and run next
FROM base AS runner

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN apk add curl \
  && apk add ca-certificates \
  && update-ca-certificates \
  && apk add --no-cache dumb-init

ARG name
ARG path

# Install Git and OpenSSH client if $name is equal to template
RUN if [ "$name" = "template" ]; then \
    apk add --no-cache git openssh-client; \
fi
RUN if [ "$name" = "desktop" ]; then \
    npm install -g prisma; \
fi
USER nextjs

# You only need to copy next.config.js if you are NOT using the default configuration
COPY --from=builder /app/$path/next.config.js ./$path/next.config.js
RUN if ["$name" = "objectstorage" ]; then \
  COPY --from=builder /app/$path/next-i18next.config.js ./$path/next-i18next.config.js; \
  fi
COPY --from=builder /app/$path/public ./$path/public
COPY --from=builder --chown=nextjs:nodejs /app/$path/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/$path/.next/static ./$path/.next/static
EXPOSE 3000

ENV PORT 3000

ENV launchpath=./${path}/server.js

ENTRYPOINT ["dumb-init", "sh", "-c", "node ${launchpath}"]