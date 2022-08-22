FROM alpine:3.16.2

ARG TARGETPLATFORM

ENTRYPOINT ["/usr/bin/sealos"]

WORKDIR /root

RUN --mount=target=/build tar xf /build/dist/sealos_*_$(echo ${TARGETPLATFORM} | tr '/' '_' | sed -e 's/arm_/arm/').tar.gz && cp sealos /usr/bin

CMD ["--help"]
