FROM gcr.io/distroless/static:nonroot
ARG TARGETARCH
WORKDIR /
COPY --from=builder /workspace/manager .
USER 65532:65532
ENTRYPOINT ["/manager"]
