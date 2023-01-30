package checker

import (
	"fmt"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/ssh"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

// PortOpenCheck ensures the given port is available for use.
type PortOpenCheck struct {
	port int
	ip   string
}

func (poc *PortOpenCheck) Name() string {
	return fmt.Sprintf("%s:PortOpenCheck", poc.ip)
}

func NewPortOpenCheck(port int, ip string) Interface {
	return &PortOpenCheck{port: port, ip: ip}
}

// Check validates if the particular port is available.
func (poc PortOpenCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Debug("%s:validating whether port %d is available", poc.ip, poc.port)
	PortOpenCMD := fmt.Sprintf("lsof -i:%d", poc.port)
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	PortOpenInfo, err := SSH.CmdToString(poc.ip, PortOpenCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get portinfo info")}
	}
	if PortOpenInfo != "" {
		return nil, []error{fmt.Errorf("port %d is already in use", poc.port)}
	}
	return nil, nil
}
