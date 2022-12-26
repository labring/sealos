/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package checker

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/labring/sealos/pkg/template"

	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/utils/exec"

	"github.com/labring/sealos/pkg/bootstrap"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	exec2 "github.com/labring/sealos/pkg/utils/exec"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type CRICtlChecker struct {
}

type Container struct {
	Container string
	State     string
	Name      string
	Attempt   int
	PodName   string
}

type CRICtlStatus struct {
	Config              map[string]string
	ImageList           []string
	ContainerList       []Container
	RegistryPullStatus  string
	ImageShimPullStatus string
	Error               string
}

func (n *CRICtlChecker) Check(cluster *v2.Cluster, phase string) error {
	if phase != PhasePost {
		return nil
	}
	status := &CRICtlStatus{}
	defer func() {
		err := n.Output(status)
		if err != nil {
			logger.Error("error output: %+v", err)
		}
	}()

	criShimConfig := "/etc/crictl.yaml"
	if cfg, err := fileutil.ReadAll(criShimConfig); err != nil {
		status.Error = errors.Wrap(err, "read crictl config error").Error()
	} else {
		cfgMap, _ := yaml.UnmarshalData(cfg)
		status.Config = map[string]string{}
		status.Config["ShimSocket"], _, _ = unstructured.NestedString(cfgMap, "image-endpoint")
		status.Config["CRISocket"], _, _ = unstructured.NestedString(cfgMap, "runtime-endpoint")
	}
	execer := exec.New()
	crictlPath, err := execer.LookPath("crictl")
	if err != nil {
		status.Error = errors.Wrap(err, "error looking for path of crictl").Error()
		return nil
	}

	imageList, err := n.getCRICtlImageList(crictlPath)
	if err != nil {
		status.Error = errors.Wrap(err, "error list images of crictl").Error()
	}
	status.ImageList = imageList

	containerList, err := n.getCRICtlContainerList(crictlPath)
	if err != nil {
		status.Error = errors.Wrap(err, "error ps container of crictl").Error()
	}
	status.ContainerList = containerList

	pauseImage := ""
	for _, mountImg := range cluster.Status.Mounts {
		if mountImg.Type == v2.RootfsImage || mountImg.Type == v2.PatchImage {
			pauseImage = mountImg.Env["sandboxImage"]
		}
	}
	sshCtx, err := ssh.NewSSHByCluster(cluster, false)
	if err != nil {
		status.Error = errors.Wrap(err, "get ssh interface error").Error()
		return nil
	}

	root := constants.NewData(cluster.Name).RootFSPath()
	regInfo := bootstrap.GetRegistryInfo(sshCtx, root, cluster.GetRegistryIPAndPort())

	regStatus, err := n.getRegistryStatus(crictlPath, pauseImage, fmt.Sprintf("%s:%s", regInfo.Domain, regInfo.Port))
	if err != nil {
		status.Error = errors.Wrap(err, "pull registry image error").Error()
	}
	status.RegistryPullStatus = regStatus

	shimStatus, err := n.getRegistryStatus(crictlPath, pauseImage, "k8s.gcr.io")
	if err != nil {
		status.Error = errors.Wrap(err, "pull shim image error").Error()
	}
	status.ImageShimPullStatus = shimStatus
	status.Error = Nil
	return nil
}

func (n *CRICtlChecker) Output(status *CRICtlStatus) error {
	tpl, isOk, err := template.TryParse(`
CRI Status
  Error: {{ .Error }}
  RegistryPullStatus: {{ .RegistryPullStatus }}
  ImageShimPullStatus: {{ .ImageShimPullStatus }}
  CRICtl ImageList:
  {{- range .ImageList }}
    - {{ . }}
  {{- end }}
  ContainerList:
  {{- range .ContainerList }}
    ContainerID: {{ .Container }}  State: {{ .State }}  Name: {{ .Name }}  Attempt: {{ .Attempt }} PodName: {{ .PodName }}
  {{- end }}
  Logger: crictl logs -f CONTAINER-ID
  Config List:
    {{- range $key,$val:= .Config }}
    {{ $key }}: {{ $val }}
    {{- end }}
`)
	if err != nil || !isOk {
		if err != nil {
			logger.Error("failed to render crictl checkers template. error: %s", err.Error())
			return err
		}
		return errors.New("convert crictl template failed")
	}
	if err = tpl.Execute(os.Stdout, status); err != nil {
		return err
	}
	return nil
}

func NewCRICtlChecker() Interface {
	return &CRICtlChecker{}
}

func (n *CRICtlChecker) getCRICtlImageList(crictlPath string) ([]string, error) {
	imagesCmd := `%s images | grep -v "IMAGE ID" | awk '{print $1":"$2}'`
	imagesOut, err := exec2.RunBashCmd(fmt.Sprintf(imagesCmd, crictlPath))
	if err != nil {
		return nil, err
	}
	images := strings.Split(imagesOut, "\n")
	imageList := make([]string, 0)
	for _, img := range images {
		if strings.TrimSpace(img) != "" {
			imageList = append(imageList, img)
		}
	}
	return imageList, nil
}

func (n *CRICtlChecker) getCRICtlContainerList(crictlPath string) ([]Container, error) {
	type psStruct struct {
		Containers []struct {
			ID           string `json:"id"`
			PodSandboxID string `json:"podSandboxId"`
			Metadata     struct {
				Name    string
				Attempt int
			}
			Image struct {
				Image string
			}
			State       string //CONTAINER_RUNNING
			Labels      map[string]string
			Annotations map[string]string
		}
	}
	ps := &psStruct{}
	psCmd := `%s  ps -a -o json`
	psOut, err := exec2.RunBashCmd(fmt.Sprintf(psCmd, crictlPath))
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(psOut), ps)

	containerList := make([]Container, 0)

	for _, c := range ps.Containers {
		cID := c.ID[:13]
		containerList = append(containerList, Container{
			Container: cID,
			State:     c.State,
			Name:      c.Metadata.Name,
			Attempt:   c.Metadata.Attempt,
			PodName:   c.Labels["io.kubernetes.pod.name"],
		})
	}
	return containerList, nil
}

func (n *CRICtlChecker) getRegistryStatus(crictlPath string, pauseImage string, registry string) (status string, err error) {
	pullCmd := `%s  pull %s/%s`
	regStatus, err := exec2.RunBashCmd(fmt.Sprintf(pullCmd, crictlPath, registry, pauseImage))
	regStatus = strings.ReplaceAll(regStatus, "\n", "")
	if err != nil {
		status = "unknown:" + regStatus
		return
	}
	status = "ok:" + regStatus
	return
}
