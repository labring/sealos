FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./notification-controller
CMD ["kubectl apply -f notification-controller/deploy.yaml"]
