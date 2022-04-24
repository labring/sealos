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
	"strings"

	"github.com/fanux/sealos/pkg/utils/logger"

	strings2 "github.com/fanux/sealos/pkg/utils/strings"

	"github.com/fanux/sealos/pkg/image/types"

	"github.com/fanux/sealos/pkg/utils/exec"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"
)

type ClusterService struct {
}

func (d *ClusterService) Create(name string, index int, images ...string) (types.ClusterManifestList, error) {
	var cmd strings.Builder
	for i, image := range images {
		cmd.WriteString(fmt.Sprintf(" buildah from --pull=never --name %s-%d %s && buildah mount %s-%d ", name, index+i, image, name, index+i))
		if i != len(images)-1 {
			cmd.WriteString(" && ")
		}
	}
	err := exec.Cmd("bash", "-c", cmd.String())
	if err != nil {
		return nil, err
	}

	return d.Inspect(name, index, len(images))
}
func (*ClusterService) Delete(name string, imageNum int) error {
	data := exec.BashEval("buildah containers --json")
	infos, err := listContainer(data)
	if err != nil {
		return err
	}
	var containerNames []string
	for i := 0; i < imageNum; i++ {
		containerNames = append(containerNames, fmt.Sprintf("%s-%d", name, i))
	}
	logger.Debug("current container names is: %v", containerNames)
	for _, info := range infos {
		if strings2.InList(info.Containername, containerNames) {
			cmd := fmt.Sprintf("buildah unmount %s && buildah rm  %s", info.Containername, info.Containername)
			if err := exec.Cmd("bash", "-c", cmd); err != nil {
				return err
			}
		}
	}
	return nil
}

func (*ClusterService) Inspect(name string, index int, imageNum int) (types.ClusterManifestList, error) {
	var clusterList types.ClusterManifestList

	for i := 0; i < imageNum; i++ {
		data := exec.BashEval(fmt.Sprintf("buildah inspect %s-%d", name, index+i))
		manifest, err := inspectContainer(data)
		if err != nil {
			return nil, err
		}
		clusterList = append(clusterList, *manifest)
	}
	return clusterList, nil
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
