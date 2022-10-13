FROM scratch

RUN useradd -u 1337 terminal
USER terminal

COPY manifests ./terminal-controller
CMD ["kubectl apply -f terminal-controller/clusterissuer.yaml", "kubectl apply -f terminal-controller/deploy.yaml"]
