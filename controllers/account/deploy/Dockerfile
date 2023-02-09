FROM scratch

USER 65532:65532
COPY manifests ./manifests/account-controller
COPY registry ./registry
CMD ["kubectl apply -f manifests/account-controller/deploy.yaml"]
