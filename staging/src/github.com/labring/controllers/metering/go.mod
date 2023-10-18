module github.com/labring/sealos/controllers/metering

go 1.20

replace (
	github.com/labring/sealos => ./../../../../../../booter
	github.com/labring/sealos/controllers/account => ./../../../../../../controllers/account
	github.com/labring/sealos/controllers/user => ./../../../../../../controllers/user
)

require (
	github.com/labring/sealos v0.0.0
	k8s.io/api v0.27.4
	k8s.io/apimachinery v0.27.4
	sigs.k8s.io/controller-runtime v0.13.0
)

require (
	github.com/go-logr/logr v1.2.4 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/kr/pretty v0.3.1 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	golang.org/x/net v0.10.0 // indirect
	golang.org/x/text v0.10.0 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
	k8s.io/klog/v2 v2.100.1 // indirect
	k8s.io/utils v0.0.0-20230406110748-d93618cff8a2 // indirect
	sigs.k8s.io/json v0.0.0-20221116044647-bc3834ca7abd // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.2.3 // indirect
)
