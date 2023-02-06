package checker

import (
	"fmt"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

// SwapCheck warns if swap is enabled
type SwapCheck struct {
	ip string
}

func NewSwapCheck(ip string) Interface {
	return &SwapCheck{}
}

// Name will return Swap as name for SwapCheck
func (swc SwapCheck) Name() string {
	return fmt.Sprintf("%s:SwapCheck", swc.ip)
}

// Check validates whether swap is enabled or not
func (swc SwapCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Debug("%s:validating whether swap is enabled or not")
	SwapStatCMD := "swapon"
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	SwapInfo, err := SSH.CmdToString(swc.ip, SwapStatCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get swap info")}
	}
	if SwapInfo != "" {
		return nil, []error{fmt.Errorf("swap is enabled")}
	}
	return nil, nil
}
