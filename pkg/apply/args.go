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

package apply

type RunArgs struct {
	Masters     string
	Nodes       string
	User        string
	Password    string
	Port        uint16
	Pk          string
	PkPassword  string
	ClusterName string
	CustomEnv   []string
	CustomCMD   []string
}

type ScaleArgs struct {
	Masters     string
	Nodes       string
	ClusterName string
}

func (a ScaleArgs) ToRunArgs() *RunArgs {
	return &RunArgs{
		Masters:     a.Masters,
		Nodes:       a.Nodes,
		ClusterName: a.ClusterName,
	}
}
