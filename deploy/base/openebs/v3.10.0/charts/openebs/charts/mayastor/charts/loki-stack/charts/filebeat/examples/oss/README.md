# OSS

This example deploy Filebeat 7.17.1 using [Filebeat OSS][] version.


## Usage

* Deploy [Elasticsearch Helm chart][].

* Deploy Filebeat chart with the default values: `make install`

* You can now setup a port forward to query Filebeat indices:

  ```
  kubectl port-forward svc/oss-master 9200
  curl localhost:9200/_cat/indices
  ```


## Testing

You can also run [goss integration tests][] using `make test`


[filebeat oss]: https://www.elastic.co/downloads/beats/filebeat-oss
[elasticsearch helm chart]: https://github.com/elastic/helm-charts/tree/7.17/elasticsearch/examples/oss/
[goss integration tests]: https://github.com/elastic/helm-charts/tree/7.17/filebeat/examples/oss/test/goss.yaml
