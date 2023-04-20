package v1

import meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"

const (
	InfraResourcePricePrefix = "sealos-infra-controller"
)

var DefaultInfraResourceGVK = []meteringcommonv1.GroupVersionKind{{
	Group:   "infra.sealos.io",
	Version: "v1",
	Kind:    "infra",
},
}
