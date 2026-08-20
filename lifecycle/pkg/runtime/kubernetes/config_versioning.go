// Copyright © 2026 sealos.
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

package kubernetes

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/Masterminds/semver/v3"

	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const (
	defaultCertificateValidityPeriod   = "876000h"
	defaultCACertificateValidityPeriod = "876000h"
)

func shouldUseKubeadmV1beta4Features(version string) (bool, error) {
	sver, err := semver.NewVersion(version)
	if err != nil {
		return false, fmt.Errorf("parse kubernetes version %q: %w", version, err)
	}
	return !sver.LessThan(V1310), nil
}

func marshalConfigsForVersion(version string, configs ...interface{}) ([]byte, error) {
	enableV1beta4Features, err := shouldUseKubeadmV1beta4Features(version)
	if err != nil {
		return nil, err
	}

	docs := make([][]byte, 0, len(configs))
	for _, cfg := range configs {
		data, err := yaml.Marshal(cfg)
		if err != nil {
			return nil, err
		}
		if enableV1beta4Features {
			data, err = appendKubeadmCertValidityPeriods(data)
			if err != nil {
				return nil, err
			}
		}
		docs = append(docs, data)
	}
	return bytes.Join(docs, []byte("\n---\n")), nil
}

func appendKubeadmCertValidityPeriods(raw []byte) ([]byte, error) {
	doc, err := yaml.UnmarshalToMap(raw)
	if err != nil {
		return nil, err
	}

	kind, _ := doc["kind"].(string)
	apiVersion, _ := doc["apiVersion"].(string)
	if kind != "ClusterConfiguration" || apiVersion != types.KubeadmV1beta4 {
		return raw, nil
	}

	var additions []string
	if _, ok := doc["certificateValidityPeriod"]; !ok {
		additions = append(additions, fmt.Sprintf("certificateValidityPeriod: %s", defaultCertificateValidityPeriod))
	}
	if _, ok := doc["caCertificateValidityPeriod"]; !ok {
		additions = append(additions, fmt.Sprintf("caCertificateValidityPeriod: %s", defaultCACertificateValidityPeriod))
	}
	if len(additions) == 0 {
		return raw, nil
	}

	if !bytes.HasSuffix(raw, []byte("\n")) {
		raw = append(raw, '\n')
	}
	return append(raw, []byte(strings.Join(additions, "\n")+"\n")...), nil
}
