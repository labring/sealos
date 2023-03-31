FROM scratch
ENV SMALL_BLOCK_WAIT_SECOND 604800
USER 65532:65532
COPY manifests ./manifests/account-controller
COPY registry ./registry

CMD ["kubectl apply -f manifests/account-controller/deploy.yaml","kubectl create configmap account-manager-configmap  --from-literal=SMALL_BLOCK_WAIT_SECOND=$SMALL_BLOCK_WAIT_SECOND -n account-system"]
