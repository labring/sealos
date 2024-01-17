// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package e2e

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/pkg/types/v1beta1"

	cmd2 "github.com/labring/sealos/test/e2e/testhelper/cmd"
	"github.com/labring/sealos/test/e2e/testhelper/kube"

	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/labring/sealos/test/e2e/terraform"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

type Applier struct {
	LocalCmd        cmd2.Interface
	RemoteCmd       cmd2.Interface
	RemoteSealosCmd *cmd2.SealosCmd
	k8sClient       kube.K8s
	Infra           *terraform.InfraDetail
	RunImages       []string
	ClusterName     string
	ImageName       string
	PatchImageName  string
	PatchImageTar   string
	ImageTar        string
	TestDir         string
	SSH             *v1beta1.SSH
}

func NewApplier(infra *terraform.InfraDetail) (*Applier, error) {
	publicSSHConfig := &v1beta1.SSH{
		User:   "root",
		Port:   22,
		Passwd: infra.Public.Password,
	}
	remoteSSH := cmd2.NewRemoteCmd(infra.Public.PublicIP, publicSSHConfig)
	remoteSealosCmd := cmd2.NewSealosCmd(settings.E2EConfig.SealosBinPath, remoteSSH)
	a := &Applier{
		Infra:           infra,
		SSH:             publicSSHConfig,
		RemoteSealosCmd: remoteSealosCmd,
		RemoteCmd:       remoteSSH,
		LocalCmd:        cmd2.LocalCmd{},
		ClusterName:     settings.GetEnvWithDefault(settings.TestClusterName, "default"),
		ImageName:       os.Getenv(settings.TestImageName),
		RunImages:       strings.Split(os.Getenv(settings.TestRunImages), ","),
		ImageTar:        os.Getenv(settings.TestImageTar),
		PatchImageName:  os.Getenv(settings.TestPatchImageName),
		PatchImageTar:   os.Getenv(settings.TestPatchImageTar),
		TestDir:         settings.DefaultTestDir,
	}
	if len(a.RunImages) == 0 {
		a.RunImages = []string{settings.HelmImageName}
		if !strings.Contains(a.ImageName, "k3s") {
			a.RunImages = append(a.RunImages, settings.CalicoImageName)
		}
	}
	if err := a.WaitSSHReady(); err != nil {
		return nil, fmt.Errorf("wait for ssh ready: %v", err)
	}
	a.Infra.Nodes = append([]terraform.Host{*a.Infra.Public}, a.Infra.Nodes...)
	if err := a.initImage(); err != nil {
		return nil, fmt.Errorf("init image: %v", err)
	}
	return a, nil
}

func (a *Applier) initImage() error {
	if err := a.RemoteCmd.Copy(settings.E2EConfig.SealosBinPath, settings.E2EConfig.SealosBinPath); err != nil {
		return fmt.Errorf("copy sealos bin to remote: %v", err)
	}

	if err := a.RemoteCmd.AsyncExec("chmod +x " + settings.E2EConfig.SealosBinPath); err != nil {
		return fmt.Errorf("chmod sealos bin: %v", err)
	}
	if a.ImageTar != "" {
		if err := a.RemoteCmd.Copy(a.ImageTar, a.ImageTar); err != nil {
			return fmt.Errorf("copy image tar to remote: %v", err)
		}
		if err := a.RemoteSealosCmd.ImageLoad(a.ImageTar); err != nil {
			return fmt.Errorf("load image tar: %v", err)
		}
	} else {
		if err := a.RemoteSealosCmd.ImagePull(&cmd2.PullOptions{
			ImageRefs: []string{a.ImageName},
			Quiet:     true,
		}); err != nil {
			return fmt.Errorf("pull image: %v", err)
		}
	}
	if a.PatchImageName == "" {
		return nil
	}
	if a.PatchImageTar != "" {
		if err := a.RemoteCmd.Copy(a.PatchImageTar, a.PatchImageTar); err != nil {
			return fmt.Errorf("copy patch image tar to remote: %v", err)
		}
		if strings.HasSuffix(a.PatchImageTar, settings.GzSuffix) {
			if err := a.RemoteCmd.AsyncExec(fmt.Sprintf("gzip %s -d", a.PatchImageTar)); err != nil {
				return fmt.Errorf("unzip patch image tar: %v", err)
			}
			a.PatchImageTar = strings.TrimSuffix(a.PatchImageTar, settings.GzSuffix)
		}
		if err := a.RemoteSealosCmd.ImageLoad(a.PatchImageTar); err != nil {
			return fmt.Errorf("load patch image tar: %v", err)
		}
		images, err := operators.NewFakeImage(a.RemoteSealosCmd).ListImages(false)
		if err != nil {
			return fmt.Errorf("list images: %v", err)
		}
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
				a.PatchImageName = patchImageName
				break
			}
		}
	} else {
		if err := a.RemoteSealosCmd.ImagePull(&cmd2.PullOptions{
			ImageRefs: []string{a.PatchImageName},
			Quiet:     true,
		}); err != nil {
			return fmt.Errorf("pull patch image: %v", err)
		}
	}
	if err := a.RemoteSealosCmd.ImageMerge(&cmd2.MergeOptions{
		Quiet:     true,
		ImageRefs: []string{a.ImageName, a.PatchImageName},
		Tag:       []string{a.ImageName},
	}); err != nil {
		return fmt.Errorf("merge image: %v", err)
	}
	return nil
}

func (a *Applier) FetchRemoteKubeConfig() {
	localConf := filepath.Join(a.TestDir, "kube", "admin.conf")
	if utils.IsFileExist(localConf) {
		utils.CheckErr(os.Rename(localConf, localConf+".bak"+time.Now().Format("20060102150405")))
	}
	utils.CheckErr(a.RemoteCmd.CopyR(localConf, "/root/.kube/config"))
	content, err := os.ReadFile(localConf)
	utils.CheckErr(err)

	certOpts := &cmd2.CertOptions{Cluster: a.ClusterName, AltName: []string{a.Infra.Public.PublicIP}}
	logger.Info("certOpts: %v", certOpts)
	/*
		 issue: output: Error: open /root/.sealos/e2e_test/etc/kubeadm-init.yaml: no such file or directory
		exec not in master0
	*/
	//pattern := regexp.MustCompile(`(?m)^(\s+server:\s+).+$`)
	//newData := pattern.ReplaceAllString(string(content), fmt.Sprintf("${1}%s:6443", a.EIp))
	newData := strings.Replace(string(content), "server: https://apiserver.cluster.local:6443", "server: https://"+a.Infra.Public.PublicIP+":6443", -1)
	utils.CheckErr(utils.WriteFile(localConf, []byte(newData)))
	utils.CheckErr(a.RemoteSealosCmd.Cert(certOpts))
	time.Sleep(30 * time.Second)
}

func (a *Applier) CheckNodeNum(num int) {
	notReady := make(map[string]struct{})
	err := retry.Retry(5, 5*time.Second, func() error {
		var err error
		a.k8sClient, err = kube.NewK8sClient(filepath.Join(a.TestDir, "kube", "admin.conf"), "https://"+a.Infra.Public.PublicIP+":6443")
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
				if condition.Reason != "KubeletReady" {
					continue
				}
				if condition.Type != "Ready" {
					notReady[node.Name] = struct{}{}
					return fmt.Errorf("node %s is not ready： %s", node.Name, condition.Type)
				}
				logger.Info("node %s is ready", node.Name)
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
	var err error
	for i := 0; i < 10; i++ {
		if err = a.RemoteCmd.AsyncExec("date"); err == nil {
			return nil
		}
		time.Sleep(time.Duration(i) * time.Second)
	}
	return fmt.Errorf("wait for host %s ssh ready timeout: %v", a.Infra.Public.PublicIP, err)
}
