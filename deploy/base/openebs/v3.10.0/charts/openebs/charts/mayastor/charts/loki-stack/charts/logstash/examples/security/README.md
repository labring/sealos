# Security

This example deploy Logstash 7.7.1 which connects to Elasticsearch using TLS
(see [values][]).


## Usage

* Deploy [Elasticsearch Helm chart with security][].

* Deploy Logstash chart: `make install`

* You can now setup a port forward to query Logstash indices:

  ```
  kubectl port-forward svc/elasticsearch-master 9200
  curl localhost:9200/_cat/indices
  ```


## Testing

You can also run [goss integration tests][] using `make test`


[elasticsearch helm chart with security]: https://github.com/elastic/helm-charts/tree/master/elasticsearch/examples/security/
[goss integration tests]: https://github.com/elastic/helm-charts/tree/master/logstash/examples/security/test/goss.yaml
[values]: https://github.com/elastic/helm-charts/tree/master/logstash/examples/security/values.yaml
