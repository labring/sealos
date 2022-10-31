FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./metering-controller
CMD ["kubectl apply -f metering-controller/deploy.yaml"]
