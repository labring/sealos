FROM scratch

USER 65532:65532

COPY manifests ./user-controller
COPY registry ./registry
CMD ["kubectl apply -f user-controller/rbac.yaml","kubectl apply -f user-controller/deploy.yaml"]
