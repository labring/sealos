FROM scratch
COPY manifests ./terminal-controller
CMD ["kubectl apply -f terminal-controller/clusterissuer.yaml", "kubectl apply -f terminal-controller/deploy.yaml"]
