FROM scratch

USER 65532:65532

COPY manifests ./metering-controller
CMD ["kubectl apply -f metering-controller/deploy.yaml"]
