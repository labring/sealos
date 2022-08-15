FROM alpine:3.16.2

ARG TARGETPLATFORM

RUN apk add --no-cache ipset iptables
ENTRYPOINT ["/usr/bin/lvscare"]
RUN --mount=target=/build cp /build/dist/lvscare_linux_${TARGETPLATFORM}/lvscare  /usr/bin/
