package apply

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/pkg/types/v1beta1"

	"github.com/labring/sealos/test/e2e/testhelper/consts"

	cmd2 "github.com/labring/sealos/test/e2e/testhelper/cmd"
	"github.com/labring/sealos/test/e2e/testhelper/kube"

	"k8s.io/apimachinery/pkg/types"

	"github.com/google/uuid"

	infra2 "github.com/labring/sealos/test/e2e/suites/infra"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"

	"sigs.k8s.io/yaml"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/labring/sealos/controllers/infra/drivers"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

type Applier struct {
	//Eip string
	EIp             []string
	InfraDriver     drivers.Driver
	LocalCmd        cmd2.Interface
	RemoteCmd       cmd2.Interface
	RemoteSealosCmd *cmd2.SealosCmd
	k8sClient       kube.K8s
	Infra           *infra2.FakeInfra
	SSH             *v1beta1.SSH
}

func (a *Applier) Init() {
	utils.CheckErr(a.WaitSSHReady())
	a.initSSH()
	a.initImage()
}

var timeSuffix = fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)

func PreSetInfraConfig(infra *v1.Infra, host *v1.Hosts) {
	arch, err := utils.GetBinArch(settings.E2EConfig.SealosBinPath)
	utils.CheckErr(err)
	host.Arch = arch
	switch arch {
	case consts.Arm64Arch:
		host.Image = infra2.AliyunArm64UbuntuImage
		host.Flavor = infra2.AliyunArm64Flavor
	case consts.Amd64Arch:
		host.Image = infra2.AliyunAmd64UbuntuImage
	}
	uid, err := uuid.NewRandom()
	utils.CheckErr(err, fmt.Sprintf("error generating UUID: %v\n", err))
	logger.Info("Generated infra UID:", uid)
	infra.Name = infra.Name + "-" + timeSuffix
	infra.Namespace = infra.Namespace + "-" + timeSuffix
	infra.UID = types.UID(uid.String())
	infra.Spec.SSH.PkName = infra.Spec.SSH.PkName + "-" + timeSuffix
}

func (a *Applier) initImage() {
	err := a.RemoteCmd.Copy(settings.E2EConfig.SealosBinPath, settings.E2EConfig.SealosBinPath)
	utils.CheckErr(err)
	err = a.RemoteCmd.AsyncExec("chmod +x " + settings.E2EConfig.SealosBinPath)
	utils.CheckErr(err)
	a.RemoteSealosCmd = cmd2.NewSealosCmd(settings.E2EConfig.SealosBinPath, a.RemoteCmd)
	if a.Infra.ImageTar != "" {
		err = a.RemoteCmd.Copy(a.Infra.ImageTar, a.Infra.ImageTar)
		utils.CheckErr(err)
		err = a.RemoteSealosCmd.ImageLoad(a.Infra.ImageTar)
		utils.CheckErr(err)
	} else {
		err = a.RemoteSealosCmd.ImagePull(&cmd2.PullOptions{
			ImageRefs: []string{a.Infra.ImageName},
			Quiet:     true,
		})
		utils.CheckErr(err)
	}
	if a.Infra.PatchImageName == "" {
		return
	}
	if a.Infra.PatchImageTar != "" {
		err = a.RemoteCmd.Copy(a.Infra.PatchImageTar, a.Infra.PatchImageTar)
		utils.CheckErr(err)
		if strings.HasSuffix(a.Infra.PatchImageTar, settings.GzSuffix) {
			err = a.RemoteCmd.AsyncExec(fmt.Sprintf("gzip %s -d", a.Infra.PatchImageTar))
			utils.CheckErr(err)
			a.Infra.PatchImageTar = strings.TrimSuffix(a.Infra.PatchImageTar, settings.GzSuffix)
		}
		err = a.RemoteSealosCmd.ImageLoad(a.Infra.PatchImageTar)
		utils.CheckErr(err)
		images, err := operators.NewFakeImage(a.RemoteSealosCmd).ListImages(false)
		utils.CheckErr(err)
		logger.Info("images:", images)
		patchImageName := ""
		for _, image := range images {
			for i := range image.Names {
				if strings.Contains(image.Names[i], "sealos-patch") {
					patchImageName = image.Names[i]
					break
				}
			}
			if patchImageName != "" {
				a.Infra.PatchImageName = patchImageName
				break
			}
		}
	} else {
		err = a.RemoteSealosCmd.ImagePull(&cmd2.PullOptions{
			ImageRefs: []string{a.Infra.PatchImageName},
			Quiet:     true,
		})
		utils.CheckErr(err)
	}
	err = a.RemoteSealosCmd.ImageMerge(&cmd2.MergeOptions{
		Quiet:     true,
		ImageRefs: []string{a.Infra.ImageName, a.Infra.PatchImageName},
		Tag:       []string{a.Infra.ImageName},
	})
	utils.CheckErr(err)
}

func (a *Applier) initSSH() {
	utils.CheckErr(utils.WriteFile(a.SSH.Pk, []byte(a.SSH.PkData)))
	utils.CheckErr(a.RemoteCmd.Copy(a.SSH.Pk, a.SSH.Pk))
	utils.CheckErr(a.RemoteCmd.AsyncExec("chmod", "0400", a.SSH.Pk))
}

func (a *Applier) FetchRemoteKubeConfig() {
	localConf := filepath.Join(a.Infra.TestDir, "kube", "admin.conf")
	if utils.IsFileExist(localConf) {
		utils.CheckErr(os.Rename(localConf, localConf+".bak"+time.Now().Format("20060102150405")))
	}
	utils.CheckErr(a.RemoteCmd.CopyR(localConf, "/root/.kube/config"))
	content, err := os.ReadFile(localConf)
	utils.CheckErr(err)

	certOpts := &cmd2.CertOptions{Cluster: a.Infra.ClusterName, AltName: a.EIp}
	logger.Info("certOpts: %v", certOpts)
	/*
		 issue: output: Error: open /root/.sealos/e2e_test/etc/kubeadm-init.yaml: no such file or directory
		exec not in master0
	*/
	//pattern := regexp.MustCompile(`(?m)^(\s+server:\s+).+$`)
	//newData := pattern.ReplaceAllString(string(content), fmt.Sprintf("${1}%s:6443", a.EIp))
	newData := strings.Replace(string(content), "server: https://apiserver.cluster.local:6443", "server: https://"+a.EIp[0]+":6443", -1)
	utils.CheckErr(utils.WriteFile(localConf, []byte(newData)))
	utils.CheckErr(a.RemoteSealosCmd.Cert(certOpts))
	time.Sleep(30 * time.Second)
}

func (a *Applier) CheckNodeNum(num int) {
	notReady := make(map[string]struct{})
	err := retry.Retry(5, 5*time.Second, func() error {
		var err error
		a.k8sClient, err = kube.NewK8sClient(filepath.Join(a.Infra.TestDir, "kube", "admin.conf"), "https://"+a.EIp[0]+":6443")
		if err != nil {
			return err
		}
		nodes, err := a.k8sClient.ListNodes()
		if err != nil {
			return err
		}

		//kubectl get nodes --no-headers=true | awk '$2 != "Ready" {print}'
		//not_ready_nodes=$(kubectl get nodes --no-headers | awk '{ if ($2 != "Ready") print $1 }')
		for _, node := range nodes.Items {
			for _, condition := range node.Status.Conditions {
				if condition.Status == "False" || condition.Status == "Unknown" {
					continue
				}
				if condition.Type != "Ready" {
					notReady[node.Name] = struct{}{}
					return fmt.Errorf("node %s is not ready", node.Name)
				}
				delete(notReady, node.Name)
			}
		}

		return nil
	})
	utils.CheckErr(err)
	nodes, listErr := a.k8sClient.ListNodes()
	utils.CheckErr(listErr)
	for i := range nodes.Items {
		nodeInfo, _ := yaml.Marshal(nodes.Items[i])
		fmt.Printf("node info: %s \n", string(nodeInfo))
		if _, ok := notReady[nodes.Items[i].Name]; !ok {
			continue
		}
		logger.Error("node %s is not ready: %v", nodes.Items[i].Name, err)
	}
	utils.CheckEqual(len(nodes.Items), num)
}

func (a *Applier) WaitSSHReady() error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, h := range a.EIp {
		host := h
		eg.Go(func() error {
			for i := 0; i < 10; i++ {
				if err := a.RemoteCmd.AsyncExec("date"); err == nil {
					return nil
				}
				time.Sleep(time.Duration(i) * time.Second)
			}
			return fmt.Errorf("wait for host %s ssh ready timeout", host)
		})
	}
	return eg.Wait()
}
