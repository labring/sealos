package checker

import (
	"fmt"
	"strconv"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

// NumCPUCheck checks if current number of CPUs is not less than required
type NumCPUCheck struct {
	limit int
	ip    string
}

// Name returns the label for NumCPUCheck
func (ncc *NumCPUCheck) Name() string {
	return fmt.Sprintf("%s:NumCPUCheck", ncc.ip)
}

func NewNumCPUCheck(NumsCPU int, ip string) Interface {
	return &NumCPUCheck{limit: NumsCPU, ip: ip}
}

// Check number of CPUs required by kubeadm
func (ncc NumCPUCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Debug("%s:start CPU check", ncc.ip)
	NumCPUCMD := "cat /proc/cpuinfo| grep \"processor\"| wc -l"
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	numCPU, err := SSH.CmdToString(ncc.ip, NumCPUCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get cpu info")}
	}
	nCPU, err := strconv.Atoi(numCPU)
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get cpu info")}
	}
	if nCPU < ncc.limit {
		return nil, []error{fmt.Errorf("the number of available CPUs %s is less than the required %d", numCPU, ncc.limit)}
	}
	return nil, nil
}

// MemCheck checks if the number of megabytes of memory is not less than required
type MemCheck struct {
	limit uint64
	ip    string
}

// Name returns the label for NewMemCheck
func NewMemCheck(NumsMem uint64, ip string) Interface {
	return &MemCheck{limit: NumsMem, ip: ip}
}

func (mc MemCheck) Name() string {
	return fmt.Sprintf("%s:MemCheck", mc.ip)
}

// Check number of memory required by kubeadm
func (mc MemCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Debug("%s:start MemCheck", mc.ip)
	NumMemTotalCMD := "cat /proc/meminfo | grep \"MemTotal\" | awk '{print $2}'"
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	numMem, err := SSH.CmdToString(mc.ip, NumMemTotalCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get system info")}
	}
	memTotal, err := strconv.ParseUint(numMem, 10, 64)
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get system info")}
	}
	actual := memTotal / 1024
	if actual < mc.limit {
		return nil, []error{fmt.Errorf("the system RAM (%d MB) is less than the minimum %d MB", actual, mc.limit)}
	}
	return nil, nil
}
