package apply

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"sigs.k8s.io/yaml"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/labring/sealos/controllers/infra/drivers"
	"github.com/labring/sealos/test/e2e/suites/cmd"
	"github.com/labring/sealos/test/e2e/suites/kube"
	"github.com/labring/sealos/test/e2e/testhelper"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

type Applier struct {
	//Eip string
	EIp             []string
	InfraDriver     drivers.Driver
	LocalCmd        cmd.CmdInterface
	RemoteCmd       cmd.CmdInterface
	RemoteSealosCmd *cmd.SealosCmd
	k8sClient       kube.K8s
}

func (a *Applier) Init() {
	testhelper.CheckErr(a.WaitSSHReady())
	a.initSSH()
	a.initImage()
}

func PreCheckEnv() {
	if settings.E2EConfig.InfraDriver == "aliyun" {
		testhelper.CheckEnvSetting([]string{"ALIYUN_REGION_ID", "ALIYUN_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_SECRET", "ALIYUN_REGION_ID"})
	}
	if settings.E2EConfig.ImageName == "" {
		if settings.E2EConfig.ImageTar != "" {
			testhelper.CheckErr(fmt.Errorf("image name is empty, please set env %s", settings.SEALOS_E2E_TEST_IMAGE_NAME))
		}
		settings.E2EConfig.ImageName = settings.DefaultTestImageName
	}
	logger.Info("e2e test image name is %s", settings.E2EConfig.ImageName)
	logger.Info("e2e test infra driver is %s", settings.E2EConfig.InfraDriver)
	if settings.E2EConfig.ImageTar != "" {
		if !testhelper.IsFileExist(settings.E2EConfig.ImageTar) {
			testhelper.CheckErr(fmt.Errorf("image tar is not exist, path: %s", settings.E2EConfig.ImageTar))
		}
		logger.Info("e2e test image tar path is %s", settings.E2EConfig.ImageTar)
	}
	if settings.E2EConfig.PatchImageTar != "" {
		if !testhelper.IsFileExist(settings.E2EConfig.PatchImageTar) {
			testhelper.CheckErr(fmt.Errorf("image tar is not exist, path: %s", settings.E2EConfig.ImageTar))
		}
		logger.Info("e2e test patch image tar path is %s", settings.E2EConfig.PatchImageTar)
		if settings.E2EConfig.PatchImageName == "" {
			testhelper.CheckErr(fmt.Errorf("patch image name is empty, please set env %s", settings.SEALOS_E2E_TEST_PATCH_IMAGE_NAME))
		}
		logger.Info("e2e test patch image name is %s", settings.E2EConfig.PatchImageName)
	}
	if settings.E2EConfig.SealosBinPath == "" {
		testhelper.CheckErr(fmt.Errorf("sealos bin path is empty, please set env %s", settings.SEALOS_E2E_TEST_SEALOS_BIN_PATH))
	} else {
		logger.Info("e2e test sealos bin path is %s", settings.E2EConfig.SealosBinPath)
	}
}

func (a *Applier) initImage() {
	err := a.RemoteCmd.Copy(settings.E2EConfig.SealosBinPath, settings.E2EConfig.SealosBinPath)
	testhelper.CheckErr(err)
	err = a.RemoteCmd.AsyncExec("chmod +x " + settings.E2EConfig.SealosBinPath)
	testhelper.CheckErr(err)
	a.RemoteSealosCmd = cmd.NewSealosCmd(settings.E2EConfig.SealosBinPath, a.RemoteCmd)
	if settings.E2EConfig.ImageTar != "" {
		err = a.RemoteCmd.Copy(settings.E2EConfig.ImageTar, settings.E2EConfig.ImageTar)
		testhelper.CheckErr(err)
		err = a.RemoteSealosCmd.ImageLoad(settings.E2EConfig.ImageTar)
		testhelper.CheckErr(err)
	} else {
		err = a.RemoteSealosCmd.ImagePull(settings.E2EConfig.ImageName)
		testhelper.CheckErr(err)
	}
	if settings.E2EConfig.PatchImageTar != "" {
		err = a.RemoteCmd.Copy(settings.E2EConfig.PatchImageTar, settings.E2EConfig.PatchImageTar)
		testhelper.CheckErr(err)
		err = a.RemoteSealosCmd.ImageLoad(settings.E2EConfig.PatchImageTar)
		testhelper.CheckErr(err)
	} else if settings.E2EConfig.PatchImageName != "" {
		err = a.RemoteSealosCmd.ImagePull(settings.E2EConfig.PatchImageName)
		testhelper.CheckErr(err)
		err = a.RemoteSealosCmd.ImageMerge(settings.E2EConfig.ImageName, []string{settings.E2EConfig.ImageName, settings.E2EConfig.PatchImageName})
		testhelper.CheckErr(err)
	}
}

func (a *Applier) initSSH() {
	testhelper.CheckErr(testhelper.WriteFile(settings.E2EConfig.SSH.Pk, []byte(settings.E2EConfig.SSH.PkData)))
	testhelper.CheckErr(a.RemoteCmd.Copy(settings.E2EConfig.SSH.Pk, settings.E2EConfig.SSH.Pk))
	testhelper.CheckErr(a.RemoteCmd.AsyncExec("chmod", "0400", settings.E2EConfig.SSH.Pk))
}

func (a *Applier) FetchRemoteKubeConfig() {
	localConf := filepath.Join(settings.E2EConfig.TestDir, "kube", "admin.conf")
	if testhelper.IsFileExist(localConf) {
		testhelper.CheckErr(os.Rename(localConf, localConf+".bak"+time.Now().Format("20060102150405")))
	}
	testhelper.CheckErr(a.RemoteCmd.CopyR(localConf, "/root/.kube/config"))
	content, err := os.ReadFile(localConf)
	testhelper.CheckErr(err)

	certOpts := &cmd.CertOptions{Cluster: settings.E2EConfig.ClusterName, AltName: a.EIp}
	logger.Info("certOpts: %v", certOpts)
	/*
		 issue: output: Error: open /root/.sealos/e2e_test/etc/kubeadm-init.yaml: no such file or directory
		exec not in master0
	*/
	//pattern := regexp.MustCompile(`(?m)^(\s+server:\s+).+$`)
	//newData := pattern.ReplaceAllString(string(content), fmt.Sprintf("${1}%s:6443", a.EIp))
	newData := strings.Replace(string(content), "server: https://apiserver.cluster.local:6443", "server: https://"+a.EIp[0]+":6443", -1)
	testhelper.CheckErr(testhelper.WriteFile(localConf, []byte(newData)))
	testhelper.CheckErr(a.RemoteSealosCmd.Cert(certOpts))
	time.Sleep(30 * time.Second)
}

func (a *Applier) CheckNodeNum(num int) {
	notReady := make(map[string]struct{})
	err := retry.Retry(10, 5*time.Second, func() error {
		var err error
		a.k8sClient, err = kube.NewK8sClient(filepath.Join(settings.E2EConfig.TestDir, "kube", "admin.conf"), "https://"+a.EIp[0]+":6443")
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
				if _, ok := notReady[node.Name]; ok {
					delete(notReady, node.Name)
				}
			}
		}

		return nil
	})
	testhelper.CheckErr(err)
	nodes, listErr := a.k8sClient.ListNodes()
	testhelper.CheckErr(listErr)
	for i := range nodes.Items {
		nodeInfo, _ := yaml.Marshal(nodes.Items[i])
		fmt.Printf("node info: %s \n", string(nodeInfo))
		if _, ok := notReady[nodes.Items[i].Name]; !ok {
			continue
		}
		logger.Error("node %s is not ready: %v", nodes.Items[i].Name, err)
	}
	testhelper.CheckEqual(len(nodes.Items), num)
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
