/*
Copyright 2021 cuisongliu@qq.com.

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

package v1beta1

func DefaultInfra(infra *Infra, fn func(infra *Infra) error) error {
	defaultCluster(infra)
	defaultHosts(infra)
	defaultToStatus(infra)
	return fn(infra)
}

func In(key string, slice []string) bool {
	for _, s := range slice {
		if key == s {
			return true
		}
	}
	return false
}

func DefaultCluster(cluster *Cluster, fn func(cluster *Cluster) error) error {
	defaultSSH(cluster)
	return fn(cluster)
}
