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

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/image/types"

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"
)

type ClusterService struct {
}

func (d *ClusterService) Create(name string, image string) (*types.ClusterManifest, error) {
	data := exec.BashEval("buildah containers --json")
	infos, err := listContainer(data)
	if err != nil {
		return nil, err
	}

	for _, info := range infos {
		if info.Containername == name {
			cmd := fmt.Sprintf("buildah unmount %s && buildah rm  %s", info.Containername, info.Containername)
			if err = exec.Cmd("bash", "-c", cmd); err != nil {
				return nil, err
			}
		}
	}

	cmd := fmt.Sprintf(" buildah from --pull=never --name %s %s && buildah mount %s ", name, image, name)
	err = exec.Cmd("bash", "-c", cmd)
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
	logger.Debug("current container names is: %v", name)
	for _, info := range infos {
		if info.Containername == name {
			cmd := fmt.Sprintf("buildah unmount %s && buildah rm  %s", info.Containername, info.Containername)
			if err = exec.Cmd("bash", "-c", cmd); err != nil {
				return err
			}
		}
	}
	return nil
}

func (*ClusterService) Inspect(name string) (*types.ClusterManifest, error) {
	data := exec.BashEval(fmt.Sprintf("buildah inspect %s", name))
	manifest, err := inspectContainer(data)
	if err != nil {
		return nil, err
	}
	return manifest, nil
}

func (*ClusterService) List() ([]types.ClusterInfo, error) {
	data := exec.BashEval("buildah containers --json")
	infos, err := listContainer(data)
	if err != nil {
		return nil, err
	}
	return infos, nil
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

func listContainer(data string) ([]types.ClusterInfo, error) {
	if data != "" {
		var outStruct []types.ClusterInfo
		err := json.Unmarshal([]byte(data), &outStruct)
		if err != nil {
			return nil, errors.Wrap(err, "decode out json from list container failed")
		}
		return outStruct, nil
	}
	return nil, errors.New("containers output is empty")
}

func NewClusterService() (types.ClusterService, error) {
	return &ClusterService{}, nil
}
