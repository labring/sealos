FROM scratch

USER 65532:65532
ENV PaymentCallbackURL=""
COPY manifests ./manifests/user-controller
COPY registry ./registry
CMD ["kubectl apply -f manifests/user-controller/rbac.yaml","kubectl apply -f manifests/user-controller/deploy.yaml"]
