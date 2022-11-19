FROM ubuntu:18.04
ARG TARGETPLATFORM

WORKDIR /usr/bin/
RUN --mount=target=/build tar xf /build/dist/sealos_*_$(echo ${TARGETPLATFORM} | tr '/' '_' | sed -e 's/arm_/arm/').tar.gz sealos && \
    chmod +x sealos

# nosemgrep: dockerfile.security.missing-user.missing-user
ENTRYPOINT ["/usr/bin/sealos"]
# nosemgrep: dockerfile.security.missing-user.missing-user
CMD ["--help"]
