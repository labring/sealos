FROM docker.io/cuisongliu/oci-kubernetes-without-cni:1.22.8
COPY cni ./cni
COPY registry ./registry
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
