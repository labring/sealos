// Copyright © 2021 sealos.
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

package collector

import (
	"path/filepath"

	"github.com/cavaliergopher/grab/v3"
	"github.com/fanux/sealos/pkg/utils/file"
)

type webFileCollector struct {
}

func (w webFileCollector) Collect(src, savePath string) error {
	client := grab.NewClient()
	req, err := grab.NewRequest(filepath.Join(savePath, file.Filename(src)), src)
	if err != nil {
		return err
	}
	//todo add progress message stdout same with docker pull.
	resp := client.Do(req)
	if err := resp.Err(); err != nil {
		return err
	}
	return nil
}

func NewWebFileCollector() Collector {
	return webFileCollector{}
}
