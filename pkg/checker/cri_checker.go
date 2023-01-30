package checker

import (
	"fmt"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

// CriChecker checks cri service install environment in sealos.
type CriChecker struct {
	mountpoint string
	ip         string
}

func (cc CriChecker) Name() string {
	return fmt.Sprintf("%s:CriChecker", cc.ip)
}

// Check checks cri service which will get script from images.
func (cc CriChecker) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Debug("%s:CriChecker:validating whether cri service installed environment", cc.ip)
	//checker logic
	return nil, nil
}

func NewCriChecker(mountpoint string, ip string) Interface {
	return &CriChecker{mountpoint: mountpoint, ip: ip}
}
