# Loki-Stack Helm Chart

## Prerequisites

Make sure you have Helm [installed](https://helm.sh/docs/using_helm/#installing-helm) installed.

## Get Repo Info

```console
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._

## Deploy Loki and Promtail to your cluster

### Deploy with default config

```bash
helm upgrade --install loki grafana/loki-stack
```

### Deploy in a custom namespace

```bash
helm upgrade --install loki --namespace=loki-stack grafana/loki-stack
```

### Deploy with custom config

```bash
helm upgrade --install loki grafana/loki-stack --set "key1=val1,key2=val2,..."
```

## Deploy Loki and Fluent Bit to your cluster

```bash
helm upgrade --install loki grafana/loki-stack \
    --set fluent-bit.enabled=true,promtail.enabled=false
```

## Deploy Grafana to your cluster

The chart loki-stack contains a pre-configured Grafana, simply use `--set grafana.enabled=true`

To get the admin password for the Grafana pod, run the following command:

```bash
kubectl get secret --namespace <YOUR-NAMESPACE> loki-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

To access the Grafana UI, run the following command:

```bash
kubectl port-forward --namespace <YOUR-NAMESPACE> service/loki-grafana 3000:80
```

Navigate to <http://localhost:3000> and login with `admin` and the password output above.
Then follow the [instructions for adding the loki datasource](/docs/getting-started/grafana.md), using the URL `http://loki:3100/`.
