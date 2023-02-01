package common

import "time"

const (
	InfraInstancesLabel  = "infra.sealos.io/instances/label"
	InfraInstancesUUID   = "infra.sealos.io/infra/uuid"
	InfraInstancesIndex  = "infra.sealos.io/instances/index"
	InfraVolumesLabel    = "infra.sealos.io/volumes/label"
	IPTypePublic         = "public"
	IPTypePrivate        = "private"
	DataVolumeLabel      = "data"
	RootVolumeLabel      = "root"
	TryTimes             = 8
	TrySleepTime         = time.Second
	TRUELable            = "true"
	SealosInfraFinalizer = "infra.sealos.io/finalizers"
	InfraVolumeIndex     = "infra.sealos.io/volumes/index"
	VolumeInfraID        = "infra.sealos.io/volumes/infraID"
	InstanceState        = "instance-state-name"
	DefaultRegion        = "cn-north-1b"
	KeyPairUser          = "sealos.io/aws/keypair/user"
	KeyPairGeneral       = "sealos.io/aws/keypair/general"
	KeyPairRoot          = "sealos.io/aws/keypair/root"
)

var DefaultRootVolumeSize = int32(40)
