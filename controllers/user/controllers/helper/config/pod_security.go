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

package config

import "strings"

const (
	PodSecurityVersion     = "v1.25"
	PodSecurityLabelPrefix = "pod-security.kubernetes.io/"
)

func IsPodSecurityLabel(key string) bool {
	return strings.HasPrefix(key, PodSecurityLabelPrefix)
}

func SetPodSecurity(labels map[string]string) map[string]string {
	labels[PodSecurityLabelPrefix+"enforce"] = "baseline"
	labels[PodSecurityLabelPrefix+"enforce-version"] = PodSecurityVersion
	labels[PodSecurityLabelPrefix+"audit"] = "restricted"
	labels[PodSecurityLabelPrefix+"audit-version"] = PodSecurityVersion
	labels[PodSecurityLabelPrefix+"warn"] = "restricted"
	labels[PodSecurityLabelPrefix+"warn-version"] = PodSecurityVersion
	return labels
}
