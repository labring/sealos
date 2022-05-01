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
	"bufio"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"
)

// DecodeImages decode image from yaml content
func DecodeImages(body string) []string {
	var list []string

	reader := strings.NewReader(body)
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		l := decodeLine(scanner.Text())
		if l != "" {
			list = append(list, l)
		}
	}
	if err := scanner.Err(); err != nil {
		logger.Error(err.Error())
		return list
	}

	return list
}

func decodeLine(line string) string {
	l := strings.Replace(line, `"`, "", -1)
	ss := strings.SplitN(l, ":", 2)
	if len(ss) != 2 {
		return ""
	}
	if !strings.HasSuffix(ss[0], "image") || strings.Contains(ss[0], "#") {
		return ""
	}

	return strings.Replace(ss[1], " ", "", -1)
}
