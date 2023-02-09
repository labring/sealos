FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./manifests/terminal-controller
CMD ["kubectl apply -f manifests/terminal-controller/deploy.yaml"]
