FROM scratch
LABEL image="ghcr.io/labring/sealos/service/auth"
COPY main ./main
COPY auth.yaml auth.yaml
CMD ["./main", "-config", "./auth.yaml"]