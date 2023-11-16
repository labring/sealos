FROM node:20.4 AS builder

ARG SEALOS_LANG=zh-Hans
ARG BD_TOKEN
ENV BD_TOKEN=$BD_TOKEN

WORKDIR /app

COPY . /app

RUN mkdir website/i18n/zh-Hans/docusaurus-plugin-content-docs/; \
    cp -r 4.0/i18n/zh-Hans/ website/i18n/zh-Hans/docusaurus-plugin-content-docs/current/; \
    cp 4.0/i18n/zh-Hans/current.json  website/i18n/zh-Hans/docusaurus-plugin-content-docs/current.json; \
    cp 4.0/code.json  website/i18n/zh-Hans/code.json; \
    mkdir website/i18n/zh-Hans/docusaurus-plugin-content-blog/; \
    cp -r blog/zh-Hans/ website/i18n/zh-Hans/docusaurus-plugin-content-blog; \
    cp blog/zh-Hans/options.json  website/i18n/zh-Hans/docusaurus-plugin-content-blog/options.json
WORKDIR /app/website

RUN yarn install

RUN yarn run build

FROM fholzer/nginx-brotli:latest

COPY --from=builder /app/website/build /usr/share/nginx/html