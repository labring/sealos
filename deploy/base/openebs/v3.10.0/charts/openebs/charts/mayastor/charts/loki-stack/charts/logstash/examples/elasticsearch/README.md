# Elasticsearch

This example deploy Logstash 7.17.1 which connects to Elasticsearch (see
[values][]).


## Usage

* Deploy [Elasticsearch Helm chart][].

* Deploy Logstash chart: `make install`

* You can now setup a port forward to query Logstash indices:

  ```
  kubectl port-forward svc/elasticsearch-master 9200
  curl localhost:9200/_cat/indices
  ```


## Testing

You can also run [goss integration tests][] using `make test`


[elasticsearch helm chart]: https://github.com/elastic/helm-charts/tree/7.17/elasticsearch/examples/default/
[goss integration tests]: https://github.com/elastic/helm-charts/tree/7.17/logstash/examples/elasticsearch/test/goss.yaml
[values]: https://github.com/elastic/helm-charts/tree/7.17/logstash/examples/elasticsearch/values.yaml
