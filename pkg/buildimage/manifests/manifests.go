// Copyright © 2021 Alibaba Group Holding Ltd.
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

package manifests

import (
	"fmt"
	"os"
	"path/filepath"
)

type Manifests struct{}

// ListImages List all the containers images in manifest files
func (manifests *Manifests) ListImages(yamlFile string) ([]string, error) {
	yamlBytes, err := os.ReadFile(filepath.Clean(yamlFile))
	if err != nil {
		return nil, fmt.Errorf("read file failed %s", err)
	}

	images, err := ParseImages(string(yamlBytes))
	if err != nil {
		return images, fmt.Errorf("failed to parse images from file %s", err)
	}

	return images, nil
}

func NewManifests() (*Manifests, error) {
	return &Manifests{}, nil
}
