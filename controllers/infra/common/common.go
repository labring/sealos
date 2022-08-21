package common

import "time"

const (
	InfraInstancesLabel = "infra.sealos.io/instances/label"
	InfraInstancesIndex = "infra.sealos.io/instances/index"
	InfraVolumesLabel   = "infra.sealos.io/volumes/label"
	DataVolumeLabel     = "Data"
	RootVolumeLabel     = "Root"
	TryTimes            = 8
	TrySleepTime        = time.Second
	TRUELable           = "true"
)
