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

FROM node:current-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
ARG mirror
RUN if [ "$mirror" = "tsinghua"]; then \
    echo "MIRROR: $mirror"; \
    sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories; \
  else \
    sed -i 's/https/http/' /etc/apk/repositories; \
  fi

RUN apk add curl \
  && apk add ca-certificates \
  && update-ca-certificates

ARG name
ARG path

# Install Git and OpenSSH client if $name is equal to template
RUN if [ "$name" = "template" ]; then \
    apk add --no-cache git openssh-client; \
fi
USER nextjs

EXPOSE 3000

ENV PORT 3000
# Install dependencies only when needed
FROM node:current-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat && npm install -g pnpm
WORKDIR /app

# Install dependencies based on the preferred package manager root workspace
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./

RUN \
  [ -f pnpm-lock.yaml ] && pnpm fetch || \
  (echo "Lockfile not found." && exit 1) 
COPY ./tsconfig.json ./tsconfig.json
COPY ./tsconfig.deps.json ./tsconfig.deps.json
COPY ./tsconfig.base.json ./tsconfig.base.json
COPY ./packages ./packages

RUN pnpm -r --offline --filter=./packages/* install \
&& pnpm -r --filter=./packages/* run build 

# Rebuild the source code only when needed
FROM node:current-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# COPY --from=deps /app/packages ./packages
# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm install -g pnpm


COPY --from=deps /app/packages ./packages

COPY . .
# RUN pnpm -r --offline --filter=./packages/* install \
# && pnpm -r --filter=./packages/* run build 


ARG name
ARG path

RUN pnpm --offline --filter=$name install && pnpm --filter=$name run build

# Production image, copy all the files and run next
FROM runner

ARG name
ARG path

# You only need to copy next.config.js if you are NOT using the default configuration
# COPY --from=builder /app/desktop/next.config.js ./
COPY --from=builder /app/$path/public ./$path/public
COPY --from=builder --chown=nextjs:nodejs /app/$path/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/$path/.next/static ./$path/.next/static

ENV launchpath=./${path}/server.js

ENTRYPOINT ["sh","-c","node ${launchpath}"]


