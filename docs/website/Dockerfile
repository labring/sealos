FROM node:20.4 AS builder

ARG SEALOS_LANG=zh-Hans
ARG BD_TOKEN
ENV BD_TOKEN=$BD_TOKEN

WORKDIR /app

COPY . /app

WORKDIR /app/website

RUN yarn install

RUN yarn run build

FROM fholzer/nginx-brotli:latest

COPY --from=builder /app/website/build /usr/share/nginx/html