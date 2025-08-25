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

package e2e

import (
	"fmt"
	"strings"

	"github.com/onsi/gomega"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/suites/operators"
	"github.com/labring/sealos/test/e2e/testhelper/utils"
)

func checkVersionImageList(fakeClient *operators.FakeClient) error {
	displayImages, err := fakeClient.CRI.ImageList()
	utils.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
	gomega.Expect(displayImages).NotTo(gomega.BeNil())
	errors := make([]string, 0)
	for _, image := range displayImages.Images {
		for _, tag := range image.RepoTags {
			if strings.HasPrefix(tag, "sealos.hub:5000") {
				logger.Info("crictl image is: %v", tag)
				continue
			}
			registries := []string{
				"k8s.gcr.io",
				"registry.k8s.io",
			}
			for _, registry := range registries {
				if strings.HasPrefix(tag, registry) {
					logger.Warn("crictl image is not in registry: %v", tag)
					errors = append(errors, tag)
					continue
				}
			}
			logger.Warn("crictl image is not in registry not k8s image: %v", tag)
		}
	}
	if len(errors) > 0 {
		return fmt.Errorf("crictl image is not in registry: %v", errors)
	}
	return nil
}
