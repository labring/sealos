FROM ubuntu:18.04

ARG TARGETPLATFORM

ENTRYPOINT ["/usr/bin/sealos"]

WORKDIR /usr/bin/

RUN --mount=target=/build tar xf /build/dist/sealos_*_$(echo ${TARGETPLATFORM} | tr '/' '_' | sed -e 's/arm_/arm/').tar.gz sealos && \
    chmod +x sealos

CMD ["--help"]
