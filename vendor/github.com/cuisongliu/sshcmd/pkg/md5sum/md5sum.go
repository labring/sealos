package md5sum

import (
	"fmt"
	"github.com/wonderivan/logger"
	"os/exec"
)

func FromLocal(localPath string) string {
	cmd := fmt.Sprintf("md5sum %s | cut -d\" \" -f1", localPath)
	c := exec.Command("sh", "-c", cmd)
	out, err := c.CombinedOutput()
	if err != nil {
		logger.Error(err)
	}
	md5 := string(out)
	return md5
}
