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

package binary

import (
	"fmt"

	"github.com/fanux/sealos/pkg/image/types"

	"github.com/fanux/sealos/pkg/utils/exec"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"
)

type ClusterService struct {
}

func (d *ClusterService) Create(name, image string) (*types.ClusterManifest, error) {
	cmd := fmt.Sprintf("buildah from --name %s %s && buildah mount %s", name, image, name)
	err := exec.CmdForPipe("bash", "-c", cmd)
	if err != nil {
		return nil, err
	}
	return d.Inspect(name)
}
func (*ClusterService) Delete(name string) error {
	data := exec.BashEval("buildah containers --json")
	infos, err := listContainer(data)
	if err != nil {
		return err
	}
	for _, info := range infos {
		if info.Containername == name {
			cmd := fmt.Sprintf("buildah unmount %s && buildah rm  %s", name, name)
			return exec.CmdForPipe("bash", "-c", cmd)
		}
	}
	return nil
}

func (*ClusterService) Inspect(name string) (*types.ClusterManifest, error) {
	data := exec.BashEval(fmt.Sprintf("buildah inspect %s", name))
	return inspectContainer(data)
}

func inspectContainer(data string) (*types.ClusterManifest, error) {
	if data != "" {
		var outStruct map[string]interface{}
		err := json.Unmarshal([]byte(data), &outStruct)
		if err != nil {
			return nil, errors.Wrap(err, "decode out json from container inspect failed")
		}
		container, _, _ := unstructured.NestedString(outStruct, "Container")
		containerID, _, _ := unstructured.NestedString(outStruct, "ContainerID")
		mountPoint, _, _ := unstructured.NestedString(outStruct, "MountPoint")
		manifest := &types.ClusterManifest{
			Container:   container,
			ContainerID: containerID,
			MountPoint:  mountPoint,
		}
		return manifest, nil
	}
	return nil, errors.New("inspect output is empty")
}

type ClusterInfo struct {
	ID            string `json:"id"`
	Builder       bool   `json:"builder"`
	Imageid       string `json:"imageid"`
	Imagename     string `json:"imagename"`
	Containername string `json:"containername"`
}

func listContainer(data string) ([]ClusterInfo, error) {
	if data != "" {
		var outStruct []ClusterInfo
		err := json.Unmarshal([]byte(data), &outStruct)
		if err != nil {
			return nil, errors.Wrap(err, "decode out json from list container failed")
		}
		return outStruct, nil
	}
	return nil, errors.New("inspect output is empty")
}

func NewClusterService() (types.ClusterService, error) {
	return &ClusterService{}, nil
}
