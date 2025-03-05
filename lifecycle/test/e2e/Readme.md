## Run the Tests

To run a single test or set of tests, you'll need the [Ginkgo](https://github.com/onsi/ginkgo) tool installed on your
machine:

```console
go install github.com/onsi/ginkgo/ginkgo@v1.16.2
```

```shell
ginkgo --help
  --focus value
    	If set, ginkgo will only run specs that match this regular expression. Can be specified multiple times, values are ORed.

```

### Run image-cri-shim Tests

Test the image-cri-shim component that pulls up the cluster through sealos

```shell
sealos run labring/kubernetes:v1.25.0
ginkgo -v --forces="image-cri-shim test" e2e
```


### Testdata

using bindata to package testdata

https://github.com/go-bindata/go-bindata/tree/v3.1.1

```shell
cd test/e2e && go-bindata -nometadata -pkg testdata -ignore=testdata.go -o testdata/testdata.go testdata/
```
