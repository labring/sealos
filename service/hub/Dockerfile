FROM gcr.io/distroless/static:nonroot

ARG TARGETARCH
COPY bin/service-hub-$TARGETARCH /manager
EXPOSE 5001
USER 65532:65532
# nosemgrep: dockerfile.security.missing-user.missing-user
ENTRYPOINT "/manager"