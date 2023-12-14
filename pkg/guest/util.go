package guest

import (
	"fmt"

	"github.com/labring/sealos/pkg/constants"
)

func FormalizeWorkingCommand(clusterName string, imageName string, t string, cmd string) string {
	if cmd == "" {
		return ""
	}
	switch t {
	case constants.RootfsImage, constants.PatchImage:
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetRootWorkDir(clusterName), cmd)
	case constants.AppImage, "":
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetAppWorkDir(clusterName, imageName), cmd)
	}
	return ""
}
