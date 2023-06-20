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

package helper

const PodSecurityVersion = "v1.25"

func SetPodSecurity(labels map[string]string) map[string]string {
	labels["pod-security.kubernetes.io/enforce"] = "baseline"
	labels["pod-security.kubernetes.io/enforce-version"] = PodSecurityVersion
	labels["pod-security.kubernetes.io/audit"] = "restricted"
	labels["pod-security.kubernetes.io/audit-version"] = PodSecurityVersion
	labels["pod-security.kubernetes.io/warn"] = "restricted"
	labels["pod-security.kubernetes.io/warn-version"] = PodSecurityVersion
	return labels
}
