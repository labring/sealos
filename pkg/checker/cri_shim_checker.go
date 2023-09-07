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
	"errors"
	"fmt"
	"os"

	"github.com/labring/image-cri-shim/pkg/types"

	"github.com/labring/sreg/pkg/buildimage"

	"github.com/labring/sealos/pkg/template"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type CRIShimChecker struct {
}

type CRIShimStatus struct {
	Config    map[string]string
	ImageList []string
	Error     string
}

func (n *CRIShimChecker) Check(_ *v2.Cluster, phase string) error {
	if phase != PhasePost {
		return nil
	}
	status := &CRIShimStatus{}
	defer func() {
		err := n.Output(status)
		if err != nil {
			logger.Error("error output: %+v", err)
		}
	}()

	if shimCfg, err := types.Unmarshal(types.DefaultImageCRIShimConfig); err != nil {
		status.Error = fmt.Errorf("read image-cri-shim config error: %w", err).Error()
	} else {
		status.Config = map[string]string{}

		status.Config["ShimSocket"] = shimCfg.ImageShimSocket
		status.Config["CRISocket"] = shimCfg.RuntimeSocket
		status.Config["RegistryAddress"] = shimCfg.Address
		if status.Config["CRIVersion"] == "" {
			delete(status.Config, "CRIVersion")
		}
		status.Config["RegistryAuth"] = shimCfg.Auth

		if dir := status.Config["RootfsImageList"]; dir != "" {
			images, err := buildimage.ParseShimImages(dir)
			if err != nil {
				status.Error = fmt.Errorf("read image-cri-shim config error: %w", err).Error()
			} else {
				status.ImageList = images
			}
		}
	}

	status.Error = Nil
	return nil
}

func (n *CRIShimChecker) Output(status *CRIShimStatus) error {
	tpl, isOk, err := template.TryParse(`
CRIShim Service Status
  Error: {{ .Error }}
  Logger: journalctl -xeu image-cri-shim
  Rootfs ImageList:
  {{- range .ImageList }}
    - {{ . }}
  {{- end }}
  {{ if .Config -}}
  Config List:
    {{- range $key,$val:= .Config }}
    {{ $key }}: {{ $val }}
    {{- end }}
  {{ end }}`)
	if err != nil || !isOk {
		if err != nil {
			logger.Error("failed to render cri-shim checkers template. error: %s", err.Error())
			return err
		}
		return errors.New("convert cri-shim template failed")
	}
	return tpl.Execute(os.Stdout, status)
}

func NewCRIShimChecker() Interface {
	return &CRIShimChecker{}
}
