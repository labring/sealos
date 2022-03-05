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

package args

import (
	"fmt"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/iputils"
	strings2 "github.com/fanux/sealos/pkg/utils/strings"
	"k8s.io/apimachinery/pkg/util/sets"
)

func initCluster(clusterName string) *v2.Cluster {
	cluster := &v2.Cluster{}
	cluster.Name = clusterName
	cluster.Kind = "Cluster"
	cluster.APIVersion = v2.SchemeGroupVersion.String()
	cluster.Annotations = make(map[string]string)
	return cluster
}

func initConfig(name string, spec v2.ConfigSpec) *v2.Config {
	config := &v2.Config{}
	config.Name = name
	config.Kind = "Config"
	config.APIVersion = v2.SchemeGroupVersion.String()
	config.Spec = spec
	return config
}

func initResource(name string, spec v2.ResourceSpec) *v2.Resource {
	data := &v2.Resource{}
	data.Name = name
	data.Kind = "Resource"
	data.APIVersion = v2.SchemeGroupVersion.String()
	data.Spec = spec
	return data
}

func PreProcessIPList(joinArgs *InitArgs) error {
	if err := iputils.AssemblyIPList(&joinArgs.Masters); err != nil {
		return err
	}
	if err := iputils.AssemblyIPList(&joinArgs.Nodes); err != nil {
		return err
	}
	if err := iputils.AssemblyIPList(&joinArgs.MastersArm); err != nil {
		return err
	}
	if err := iputils.AssemblyIPList(&joinArgs.NodesArm); err != nil {
		return err
	}

	masters := strings2.SplitRemoveEmpty(joinArgs.Masters, ",")
	masterArms := strings2.SplitRemoveEmpty(joinArgs.MastersArm, ",")
	nodes := strings2.SplitRemoveEmpty(joinArgs.Nodes, ",")
	nodeArms := strings2.SplitRemoveEmpty(joinArgs.NodesArm, ",")
	length := len(masters) + len(masterArms) + len(nodes) + len(nodeArms)
	data := sets.NewString(masters...)
	data.Insert(masterArms...)
	data.Insert(nodes...)
	data.Insert(nodeArms...)
	if length != data.Len() {
		return fmt.Errorf("has duplicate ip in iplist")
	}
	return nil
}

func removeIPListDuplicatesAndEmpty(ipList []string) []string {
	return strings2.DedupeStrSlice(strings2.RemoveStrSlice(ipList, []string{""}))
}
