FROM alpine

RUN apk add --no-cache ipset iptables
COPY lvscare /usr/bin/lvscare
ENTRYPOINT ["/usr/bin/lvscare"]
