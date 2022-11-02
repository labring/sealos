FROM scratch

USER 65532:65532

COPY manifests ./imagehub-controller
CMD ["kubectl apply -f imagehub-controller/deploy.yaml"]
