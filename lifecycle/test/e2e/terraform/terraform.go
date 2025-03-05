/*
Copyright 2023 cuisongliu@qq.com.

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

package terraform

import (
	"context"
	"fmt"
	"os"
	"path"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"

	"k8s.io/client-go/util/homedir"

	executils "github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

//go:generate go run main.go

var HomeDir string

type Terraform struct {
	AccessKey string
	SecretKey string
}

func (tf *Terraform) Apply(architecture string) error {
	_, ok := executils.CheckCmdIsExist("terraform")
	if !ok {
		return fmt.Errorf("not install terraform, please install terraform. vist: https://developer.hashicorp.com/terraform/downloads ")
	}
	tf.setEnv()
	defer func() {
		tf.unsetEnv()
	}()
	file.CleanDir(HomeDir)
	_ = file.MkDirs(HomeDir)
	files := AssetNames()
	for _, f := range files {
		if f == "infra/vars.tf" {
			logger.Warn("temp var tf file, skip generator")
			continue
		}
		data, err := Asset(f)
		if err != nil {
			return err
		}
		if f == fmt.Sprintf("infra/vars.tf.%s", architecture) {
			if err = file.WriteFile(path.Join(HomeDir, "vars.tf"), data); err != nil {
				return err
			}
		}
		parts := strings.SplitN(f, "/", 2)
		if len(parts) == 2 {
			if err = file.WriteFile(path.Join(HomeDir, parts[1]), data); err != nil {
				return err
			}
		}
	}
	_ = file.CleanFiles(path.Join(HomeDir, "vars.tf.amd64"), path.Join(HomeDir, "vars.tf.arm64"))
	err := executils.CmdWithContext(context.Background(), "bash", "-c", fmt.Sprintf("cd %s && terraform init", HomeDir))
	if err != nil {
		return err
	}
	err = executils.CmdWithContext(context.Background(), "bash", "-c", fmt.Sprintf("cd %s && terraform apply -auto-approve", HomeDir))
	if err != nil {
		return err
	}
	return err
}

func (tf *Terraform) Destroy() error {
	_, ok := executils.CheckCmdIsExist("terraform")
	if !ok {
		return fmt.Errorf("not install terraform, please install terraform. vist: https://developer.hashicorp.com/terraform/downloads ")
	}
	var err error
	tf.setEnv()
	defer func() {
		tf.unsetEnv()
	}()
	if !file.IsExist(HomeDir) {
		err = fmt.Errorf("infra terraform home dir is not exist")
		return err
	}
	defer func() {
		if err == nil {
			logger.Warn("destroy error,skip clean files")
			file.CleanDir(HomeDir)
		}
	}()
	err = executils.CmdWithContext(context.Background(), "bash", "-c", fmt.Sprintf("cd %s && terraform destroy -auto-approve", HomeDir))
	if err != nil {
		return err
	}
	return nil
}

type Host struct {
	Name      string
	Password  string
	PublicIP  string
	PrivateIP string
}

type InfraDetail struct {
	Public *Host
	Nodes  []Host
}

func (tf *Terraform) Detail() (*InfraDetail, error) {
	_, ok := executils.CheckCmdIsExist("terraform")
	if !ok {
		return nil, fmt.Errorf("not install terraform, please install terraform. vist: https://developer.hashicorp.com/terraform/downloads ")
	}
	var err error
	tf.setEnv()
	defer func() {
		tf.unsetEnv()
	}()
	if !file.IsExist(path.Join(HomeDir, "terraform.tfstate")) {
		err = fmt.Errorf("infra terraform status file is not exist")
		return nil, err
	}
	data, err := file.ReadAll(path.Join(HomeDir, "terraform.tfstate"))
	if err != nil {
		return nil, err
	}
	var stateMap map[string]interface{}
	if err = json.Unmarshal(data, &stateMap); err != nil {
		return nil, err
	}
	d := &InfraDetail{}
	resources, _, _ := unstructured.NestedSlice(stateMap, "resources")
	for _, res := range resources {
		if obj, ok := res.(map[string]interface{}); ok {
			resourceType, _, _ := unstructured.NestedString(obj, "type")
			resourceName, _, _ := unstructured.NestedString(obj, "name")
			if resourceType == "alicloud_instance" {
				instances, _, _ := unstructured.NestedSlice(obj, "instances")
				for i, instance := range instances {
					if instanceObj, ok := instance.(map[string]interface{}); ok {
						h := &Host{}
						h.Name, _, _ = unstructured.NestedString(instanceObj, "attributes", "instance_name")
						h.Password, _, _ = unstructured.NestedString(instanceObj, "attributes", "password")
						h.PublicIP, _, _ = unstructured.NestedString(instanceObj, "attributes", "public_ip")
						h.PrivateIP, _, _ = unstructured.NestedString(instanceObj, "attributes", "private_ip")
						if resourceName == "sealos" {
							d.Public = h
							break
						}
						if d.Nodes == nil {
							d.Nodes = make([]Host, len(instances))
						}
						d.Nodes[i] = *h
					}
				}
			}
		}
	}
	return d, nil
}

func (tf *Terraform) setEnv() {
	_ = os.Setenv("ALICLOUD_ACCESS_KEY", tf.AccessKey)
	_ = os.Setenv("ALICLOUD_SECRET_KEY", tf.SecretKey)
}

func (tf *Terraform) unsetEnv() {
	_ = os.Unsetenv("ALICLOUD_ACCESS_KEY")
	_ = os.Unsetenv("ALICLOUD_SECRET_KEY")
}

func init() {
	if HomeDir == "" {
		HomeDir = path.Join(homedir.HomeDir(), ".infra", "terraform")
	}
}
