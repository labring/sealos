FROM scratch

USER 65532:65532

COPY manifests ./infra-controller
CMD ["kubectl apply -f infra-controller/deploy.yaml"]
