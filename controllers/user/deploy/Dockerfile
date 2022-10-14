FROM scratch

RUN useradd -u 1337 user
USER user

COPY manifests ./user-controller
COPY registry ./registry
CMD ["kubectl apply -f user-controller/rbac.yaml","kubectl apply -f user-controller/deploy.yaml"]
