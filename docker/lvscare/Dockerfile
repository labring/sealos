FROM --platform=$TARGETPLATFORM alpine:latest

RUN apk add --no-cache ipset iptables
COPY lvscare /usr/bin/lvscare
ENTRYPOINT ["/usr/bin/lvscare"]
