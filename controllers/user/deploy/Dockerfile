FROM scratch
COPY manifests ./user-controller
COPY registry ./registry
CMD ["kubectl apply -f user-controller/deploy.yaml"]
