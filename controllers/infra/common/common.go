package common

import "time"

const (
	InfraInstancesLabel   = "infra.sealos.io/instances/label"
	InfraInstancesUUID    = "infra.sealos.io/infra/uuid"
	InfraInstancesIndex   = "infra.sealos.io/instances/index"
	InfraVolumesLabel     = "infra.sealos.io/volumes/label"
	IPTypePublic          = "public"
	IPTypePrivate         = "private"
	DataVolumeLabel       = "data"
	RootVolumeLabel       = "root"
	TryTimes              = 8
	TrySleepTime          = time.Second
	TRUELable             = "true"
	SealosInfraFinalizer  = "infra.sealos.io/finalizers"
	VolumeInfraID         = "infra.sealos.io/volumes/infraID"
	InstanceState         = "instance-state-name"
	KeyPairUser           = "sealos.io/keypair/user"
	ArchAmd64             = "amd64"
	ArchArm64             = "arm64"
	InstanceStatusRunning = "running"
	AliyunKeyPairPrefix   = "infra"
	DefaultNamespace      = "default"
	MasterO               = "master0"
	CPUResourceName       = "infra/CPU"
	MemoryResourceName    = "infra/Memory"
	VolumeResourceName    = "infra/Volume"
	InfraSystemNamespace  = "infra-system"
	InfraDataAnnotation   = "infra.sealos.io/data"
)

var DefaultRootVolumeSize = int32(40)
var DriverList = []string{"aliyun", "aws"}
var CPUMap = map[string]int64{
	"t2.medium":     2,
	"t2.large":      2,
	"t2.xlarge":     4,
	"ecs.c7.large":  2,
	"ecs.g7.large":  2,
	"ecs.g7.xlarge": 4,
}
var MemoryMap = map[string]int64{
	"t2.medium":     4,
	"t2.large":      8,
	"t2.xlarge":     16,
	"ecs.c7.large":  4,
	"ecs.g7.large":  8,
	"ecs.g7.xlarge": 16,
}
