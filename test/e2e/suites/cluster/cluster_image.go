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

package cluster

import (
	"fmt"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ Interface = &fakeImageClient{}

type fakeImageClient struct {
	*fakeClient
	data []string
	*v1beta1.Cluster
}

func (f *fakeImageClient) Verify() error {
	if len(f.data) == 0 {
		return nil
	}

	initFile := fmt.Sprintf("/root/.sealos/%s/Clusterfile", f.clusterName)
	if !testhelper.IsFileExist(initFile) {
		return fmt.Errorf("file %s not exist", initFile)
	}
	if err := testhelper.UnmarshalYamlFile(initFile, f); err != nil {
		return err
	}
	imageSet := sets.NewString(f.Spec.Image...)

	if !imageSet.HasAll(f.data...) {
		return fmt.Errorf("expect image %v, but got %v", f.data, f.Spec.Image)
	}
	return nil
}
