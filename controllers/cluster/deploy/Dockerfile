FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./cluster-controller
CMD ["kubectl apply -f cluster-controller/deploy.yaml"]
