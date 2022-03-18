package runtime

import (
	"context"
	"fmt"
	"github.com/fanux/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"
	"path/filepath"
)

const (
	AuditPolicyYml      = "audit-policy.yml"
	RemoteCmdCopyStatic = "mkdir -p %s && cp -f %s %s"
)

// StaticFile :static file should not be template, will never be changed while initialization.
type StaticFile struct {
	DestinationDir string
	Name           string
}

//MasterStaticFiles Put static files here, can be moved to all master nodes before kubeadm execution
var MasterStaticFiles = []*StaticFile{
	{
		DestinationDir: "/etc/kubernetes",
		Name:           AuditPolicyYml,
	},
}

func (k *KubeadmRuntime) CopyStaticFilesToMasters() error {
	return k.CopyStaticFiles(k.getMasterIPList())
}

func (k *KubeadmRuntime) CopyStaticFiles(nodes []string) error {
	logger.Info("start to copy static files to masters")
	for _, file := range MasterStaticFiles {
		staticFilePath := filepath.Join(k.data.KubeStaticsPath(), file.Name)
		cmdLinkStatic := fmt.Sprintf(RemoteCmdCopyStatic, file.DestinationDir, staticFilePath, filepath.Join(file.DestinationDir, file.Name))
		eg, _ := errgroup.WithContext(context.Background())
		for _, host := range nodes {
			host := host
			eg.Go(func() error {
				err := k.sshCmdAsync(host, cmdLinkStatic)
				if err != nil {
					return fmt.Errorf("[%s] link static file failed, error:%s", host, err.Error())
				}
				return nil
			})
		}
		if err := eg.Wait(); err != nil {
			return err
		}
	}
	return nil
}
