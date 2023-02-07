FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./account-controller
CMD ["kubectl apply -f account-controller/deploy.yaml"]