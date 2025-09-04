# Upgrade

This example will deploy Logstash chart using an old chart version,
then upgrade it.


## Usage

* Add the Elastic Helm charts repo: `helm repo add elastic https://helm.elastic.co`

* Deploy and upgrade Logstash chart with the default values: `make install`


## Testing

You can also run [goss integration tests][] using `make test`.


[goss integration tests]: https://github.com/elastic/helm-charts/tree/master/logstash/examples/upgrade/test/goss.yaml
