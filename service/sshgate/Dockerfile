FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
COPY bin/service-sshgate-$TARGETARCH /sshgate
EXPOSE 2222
USER 65532:65532

ENTRYPOINT [ "/sshgate" ]