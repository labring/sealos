package processor

import v2 "github.com/fanux/sealos/pkg/types/v1beta1"

type Interface interface {
	// Execute :according to the different of desired cluster to do cluster apply.
	Execute(cluster *v2.Cluster) error
}
