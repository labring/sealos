package common

import "time"

const (
	InfraInstancesLabel  = "infra.sealos.io/instances/label"
	InfraInstancesUUID   = "infra.sealos.io/infra/uuid"
	InfraInstancesIndex  = "infra.sealos.io/instances/index"
	InfraVolumesLabel    = "infra.sealos.io/volumes/label"
	IPTypePublic         = "public"
	IPTypePrivate        = "private"
	DataVolumeLabel      = "Data"
	RootVolumeLabel      = "Root"
	TryTimes             = 8
	TrySleepTime         = time.Second
	TRUELable            = "true"
	SealosInfraFinalizer = "infra.sealos.io/finalizers"
)

var DefaultRootVolumeSize = int32(40)
