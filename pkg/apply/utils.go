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

import (
	"fmt"
	"net"
	"strings"

	"github.com/labring/sealos/pkg/utils/iputils"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"

	"k8s.io/apimachinery/pkg/util/sets"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func initCluster(clusterName string) *v2.Cluster {
	cluster := &v2.Cluster{}
	cluster.Name = clusterName
	cluster.Kind = "Cluster"
	cluster.APIVersion = v2.SchemeGroupVersion.String()
	cluster.Annotations = make(map[string]string)
	return cluster
}

func PreProcessIPList(joinArgs *Cluster) error {
	masters, err := iputils.ParseIPList(joinArgs.Masters)
	if err != nil {
		return err
	}
	nodes, err := iputils.ParseIPList(joinArgs.Nodes)
	if err != nil {
		return err
	}
	mset := sets.NewString(masters...)
	nset := sets.NewString(nodes...)
	ret := mset.Intersection(nset)
	if len(ret.List()) > 0 {
		return fmt.Errorf("has duplicate ip: %v", ret.List())
	}
	joinArgs.Masters = strings.Join(masters, ",")
	joinArgs.Nodes = strings.Join(nodes, ",")
	return nil
}

func removeIPListDuplicatesAndEmpty(ipList []string) []string {
	return stringsutil.RemoveDuplicate(stringsutil.RemoveStrSlice(ipList, []string{""}))
}

func IsIPList(args string) bool {
	ipList := strings.Split(args, ",")

	for _, i := range ipList {
		if !strings.Contains(i, ":") {
			return net.ParseIP(i) != nil
		}
		if _, err := net.ResolveTCPAddr("tcp", i); err != nil {
			return false
		}
	}
	return true
}
