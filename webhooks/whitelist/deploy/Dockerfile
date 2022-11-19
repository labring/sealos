FROM scratch

USER 65532:65532
COPY registry ./registry
COPY manifests ./whitelist-webhook
CMD ["kubectl apply -f whitelist-webhook/deploy.yaml"]
