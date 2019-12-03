package cloud

import (
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/wonderivan/logger"
)

const (
	ALI     = "ali"
	TENCENT = "tencent"
)

var (
	CloudConfig  Config
	CloudRequest Request
)

//Config is client config
type Config struct {
	Provider     string
	Region       string
	AccessKey    string
	AccessSecret string
}

type Disk struct {
	Name string
	Size string
}

//Request is the create vm request
type Request struct {
	//VM numbers
	Num          int
	Image        string
	Flavor       string
	NamePrefix   string
	Passwd       string
	KeyPair      string
	FIP          bool
	Disks        []Disk
	ZoneID       string
	VPCID string         // if not exist, create it
	SwitchID string   // if not exist, create it
	SecuretyGroupID string  // if not exist, create it
	ExternalArgs map[string]string
}

//VM is
type VM struct {
	ID           string
	IP           string
	FIP          string
	Name         string
	CPU          int
	Memory       int
	CreationTime string
}

//Response is
type Response struct {
	VPCID string
	SwitchID string
	SecuretyGroupID string
	VMs []VM
}

type Interface interface {
	Create(request Request) (*Response, error)
	Delete(...string) error
}

func NewProvider(config Config) Interface {
	switch config.Provider {
	case ALI:
		client, err := ecs.NewClientWithAccessKey(config.Region, config.AccessKey, config.AccessSecret)
		if err != nil {
			logger.Error("create ali client failed")
			return nil
		}
		return &AliProvider{config, client}
	case TENCENT:
		return &TencentProvider{config}
	}
	return nil
}
