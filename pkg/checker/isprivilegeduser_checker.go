package checker

import (
	"fmt"
	"strconv"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/ssh"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

// IsPrivilegedUserCheck verifies user is privileged (linux - root, windows - Administrator)
type IsPrivilegedUserCheck struct {
	ip string
}

func NewIsPrivilegedUserCheck(ip string) Interface {
	return &IsPrivilegedUserCheck{ip: ip}
}

func (ipuc IsPrivilegedUserCheck) Name() string {
	return fmt.Sprintf("%s:IsPrivilegedUserCheck", ipuc.ip)
}

// Check validates if an user has elevated (root) privileges.
func (ipuc IsPrivilegedUserCheck) Check(cluster *v2.Cluster, phase string) (warnings, errorList []error) {
	if phase != PhasePre {
		return nil, nil
	}
	logger.Debug("%s:validating if an user has elevated (root) privileges", ipuc.ip)
	IsPrivilegedUserCMD := "id -u"
	SSH := ssh.NewSSHClient(&cluster.Spec.SSH, false)
	IsPrivilegedUserInfo, err := SSH.CmdToString(ipuc.ip, IsPrivilegedUserCMD, "")
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get IsPrivilegedUserInfo info")}
	}
	IsPrivilegedUser, err := strconv.Atoi(IsPrivilegedUserInfo)
	if err != nil {
		return nil, []error{fmt.Errorf(err.Error() + "failed to get IsPrivilegedUser info")}
	}
	if IsPrivilegedUser != 0 {
		return nil, []error{fmt.Errorf("user is not privileged")}
	}
	return nil, nil
}
