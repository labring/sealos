FROM alpine:3.16.2
ARG TARGETPLATFORM

RUN apk add --no-cache ipset iptables

WORKDIR /usr/bin/
RUN --mount=target=/build tar xf /build/dist/sealos_*_$(echo ${TARGETPLATFORM} | tr '/' '_' | sed -e 's/arm_/arm/').tar.gz lvscare

# nosemgrep: dockerfile.security.missing-user.missing-user
ENTRYPOINT ["/usr/bin/lvscare"]
# nosemgrep: dockerfile.security.missing-user.missing-user
CMD ["--help"]
