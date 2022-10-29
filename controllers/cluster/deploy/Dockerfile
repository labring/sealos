FROM scratch

USER 65532:65532

COPY manifests ./cluster-controller
CMD ["kubectl apply -f cluster-controller/deploy.yaml"]
