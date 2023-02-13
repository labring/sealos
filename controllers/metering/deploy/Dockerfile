FROM scratch
USER 65532:65532
ENV METERING_INTERVAL 60
COPY registry ./registry
COPY manifests ./metering-controller
CMD ["echo $METERING_INTERVAL","kubectl apply -f metering-controller/deploy.yaml ","kubectl create configmap metering-manager-configmap --from-literal=METERING_INTERVAL=$METERING_INTERVAL -n metering-system"]
