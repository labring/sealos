FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./app-controller
CMD ["kubectl apply -f app-controller/deploy.yaml"]
