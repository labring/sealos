FROM alpine:latest

RUN apk add --no-cache ipset
COPY lvscare /usr/bin/lvscare
ENTRYPOINT ["/usr/bin/lvscare"]
