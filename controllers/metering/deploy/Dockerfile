FROM scratch
USER 65532:65532
COPY registry ./registry
COPY manifests ./metering-controller
CMD ["echo $(METERING_INTERVAL)", "kubectl apply -f metering-controller/deploy.yaml"]
