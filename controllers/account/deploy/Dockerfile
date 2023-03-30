FROM scratch

USER 65532:65532
COPY manifests ./manifests/account-controller
COPY registry ./registry
CMD ["kubectl apply -f manifests/account-controller/deploy.yaml","kubectl create configmap account-manager-configmap --from-literal=MEDIUM_BLOCK_WAIT_SECOND=$MEDIUM_BLOCK_WAIT_SECOND --from-literal=SMALL_BLOCK_WAIT_SECOND=$SMALL_BLOCK_WAIT_SECOND -n account-system"]
