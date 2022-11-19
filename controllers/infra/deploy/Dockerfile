FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./infra-controller
CMD ["kubectl apply -f infra-controller/deploy.yaml"]
