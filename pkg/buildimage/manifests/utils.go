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
	"io"
	"strings"

	"github.com/containers/image/v5/docker/reference"
	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/utils/logger"
	strutil "github.com/labring/sealos/pkg/utils/strings"
)

// ParseImages parse image from yaml content
func ParseImages(body string) ([]string, error) {
	list := sets.NewString()
	rd := bufio.NewReader(strings.NewReader(body))
	for {
		line, _, err := rd.ReadLine()
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		l := parseImageRefFromLine(string(line))
		if l != "" {
			list = list.Insert(l)
		}
	}
	return list.List(), nil
}

const imageIdentity = "image:"

// parseImageRefFromLine return valid image ref from line or null
func parseImageRefFromLine(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "#") {
		return ""
	}
	idx := strings.Index(s, imageIdentity)
	if idx < 0 {
		return ""
	}
	imageStr := strutil.TrimQuotes(strings.TrimSpace(s[idx+len(imageIdentity):]))
	if imageStr == "" {
		return ""
	}
	named, err := reference.ParseNormalizedNamed(imageStr)
	if err != nil {
		logger.Error("failed to parse image name %s: %v", s, err)
		return ""
	}
	// return namedtag only
	if namedTag, ok := named.(reference.NamedTagged); ok {
		return namedTag.Name() + ":" + namedTag.Tag()
	}
	return named.String()
}
