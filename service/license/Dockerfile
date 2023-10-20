# 指定基础镜像版本，确保每次构建都是幂等的
FROM node:18-alpine AS base

FROM base AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Node v16.13 开始支持 corepack 用于管理第三方包管理器
# 锁定包管理器版本，确保 CI 每次构建都是幂等的
# RUN corepack enable && corepack prepare pnpm@latest --activate
RUN corepack enable && corepack prepare pnpm@8.5.0 --activate

WORKDIR /app

# pnpm fetch does require only lockfile
# 注意还需要复制 `.npmrc`，因为里面可能包含 npm registry 等配置，下载依赖需要用到
COPY pnpm-lock.yaml ./

# 推荐使用 pnpm fetch 命令下载依赖到 virtual store，专为 docker 构建优化
# 参考：https://pnpm.io/cli/fetch
RUN pnpm fetch

# 将本地文件复制到构建上下文
COPY . .

# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# 基于 virtual store 生成 node_modules && 打包构建
# 此处不需要与 package registry 进行通信，因此依赖安装速度极快
# 注意 PNPM v8.4.0 版本有一个 breaking change
# 当 `node_modules` 存在，运行 `pnpm install` 会出现命令行交互操作，导致 CI 挂掉
# 这里加上 `--force` 参数，关闭命令行交互操作
RUN pnpm install --offline --force && pnpm build

FROM base AS runner

# RUN apk update && apk add --no-cache git
RUN apk add --no-cache curl

# 如果需要是用 TZ 环境变量 实现时区控制，需要安装 tzdata 这个包
# debian 的基础镜像默认情况下已经安装了 tzdata，而 ubuntu 并没有
# RUN apk add --no-cache tzdata

ARG RUNTIME_ENV
ENV RUNTIME_ENV=$RUNTIME_ENV
ENV NODE_ENV production

# Docker 容器不推荐用 root 身份运行
# 这边先建立一个特定的用户和用户组，为它分配必要的权限，使用 USER 切换到这个用户
# 注意，如果不是 root 权限，对于可执行文件，需要修改权限，确保文件可以执行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 设置时区
# 在使用 Docker 容器时，系统默认的时区就是 UTC 时间（0 时区），和我们实际需要的北京时间相差八个小时
# ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8 TZ=Asia/Shanghai
# RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# PNPM 有一个全局 store，项目中的 node_modules 实际上是全局 store 的 symlink
# 正常需要从上一阶段同时复制 `node_modules` 和全局 store，这样才能正常运行
# 但是由于 `standalone` 目录里面包含所有运行时依赖，且都是独立目录
# 因此可以直接复制该目录，无需复制全局 store（如果复制还会增加镜像体积）
# 另外运行需要的配置文件、dotfile 也都在 `standalone` 目录里面，无需单独复制

# `standalone` 模式打包，默认包含服务端代码，没有客户端代码
# 因为官方建议通过 CDN 托管，但也可以手动复制 `public`、`.next/static` 目录
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 注意，`standalone` 目录下已经包含了服务端代码，无需再复制 `.next/server`
# COPY --from=builder /app/.next/server ./.next/server

USER nextjs

# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# 默认暴露 80 端口
EXPOSE 3000

# 用 standalone 模式打包后，生成的 `standalone/node_modules` 目录下缺少 `.bin` 目录
# 导致无法用 `next` 命令启动项目，但可以用 `node server.js` 启动
# 参考：https://nextjs.org/docs/advanced-features/output-file-tracing
CMD ["node", "server.js"]
