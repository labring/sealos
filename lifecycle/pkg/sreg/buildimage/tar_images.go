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

package buildimage

import (
	"fmt"
	"github.com/labring/sealos/pkg/sreg/utils/file"
	"github.com/labring/sealos/pkg/sreg/utils/logger"
	"path"
	"strings"
)

func TarList(dir string) ([]string, error) {
	wrapGetImageErr := func(err error, s string) error {
		return fmt.Errorf("failed to get images in %s: %w", s, err)
	}
	tarDir := path.Join(dir, ImagesDirName, ImageSkopeoDirName)
	if !file.IsExist(path.Join(tarDir, ImageTarConfigName)) {
		logger.Warn("image tar config %s is not exists,skip", path.Join(tarDir, ImageTarConfigName))
		return nil, nil
	}

	images, err := file.ReadLines(path.Join(tarDir, ImageTarConfigName))
	if err != nil {
		return nil, wrapGetImageErr(err, tarDir)
	}
	for i, image := range images {
		if image == "" {
			continue
		}
		parts := strings.SplitN(image, "@", 2)
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid image format: %s", image)
		}
		if strings.HasPrefix(parts[0], "docker-archive:") || strings.HasPrefix(parts[0], "oci-archive:") {
			partOne := parts[0]

			partOneSpilt := strings.SplitN(partOne, ":", 2)
			if len(partOneSpilt) == 2 {
				originalPath := partOneSpilt[1]
				// 将原始路径和路径部分组合
				modifiedPath := path.Join(tarDir, originalPath)
				// 重新构建 partOne
				partOne = partOneSpilt[0] + ":" + modifiedPath
			}
			parts[0] = partOne
			images[i] = strings.Join(parts, "@")
		} else {
			return nil, fmt.Errorf("invalid image format: %s , must prefix in docker-archive or oci-archive", image)
		}
	}
	return images, nil
}
