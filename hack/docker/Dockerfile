# syntax=docker/dockerfile:1.0-experimental
FROM alpine:latest
MAINTAINER "louisehong <louisehong4168@gmail.com>"

ENTRYPOINT ["/usr/bin/sealos"]

ARG TARGETPLATFORM
WORKDIR /usr/bin

RUN --mount=target=/build tar xf /build/dist/sealos_*_$(echo ${TARGETPLATFORM} | tr '/' '_' | sed -e 's/arm_/arm/').tar.gz

CMD ["--help"]