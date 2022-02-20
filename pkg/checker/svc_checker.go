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

package checker

import (
	"os"
	"text/template"

	"github.com/fanux/sealos/pkg/client-go/kubernetes"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/logger"

	corev1 "k8s.io/api/core/v1"
)

type SvcChecker struct {
	client *kubernetes.Client
}

type SvcNamespaceStatus struct {
	NamespaceName       string
	ServiceCount        int
	EndpointCount       int
	UnhealthServiceList []string
}

type SvcClusterStatus struct {
	SvcNamespaceStatusList []*SvcNamespaceStatus
}

func (n *SvcChecker) Check(cluster *v2.Cluster, phase string) error {
	if phase != PhasePost {
		return nil
	}
	// checker if all the node is ready
	c, err := kubernetes.Newk8sClient()
	if err != nil {
		return err
	}
	n.client = c

	namespaceSvcList, err := n.client.ListAllNamespacesSvcs()
	var svcNamespaceStatusList []*SvcNamespaceStatus
	if err != nil {
		return err
	}
	for _, svcNamespace := range namespaceSvcList {
		serviceCount := len(svcNamespace.ServiceList.Items)
		var unhaelthService []string
		var endpointCount = 0
		endpointsList, err := n.client.GetEndpointsList(svcNamespace.Namespace.Name)
		if err != nil {
			break
		}
		for _, service := range svcNamespace.ServiceList.Items {
			if IsExistEndpoint(endpointsList, service.Name) {
				endpointCount++
			} else {
				unhaelthService = append(unhaelthService, service.Name)
			}
		}
		svcNamespaceStatus := SvcNamespaceStatus{
			NamespaceName:       svcNamespace.Namespace.Name,
			ServiceCount:        serviceCount,
			EndpointCount:       endpointCount,
			UnhealthServiceList: unhaelthService,
		}
		svcNamespaceStatusList = append(svcNamespaceStatusList, &svcNamespaceStatus)
	}
	err = n.Output(svcNamespaceStatusList)
	if err != nil {
		return err
	}
	return nil
}

func (n *SvcChecker) Output(svcNamespaceStatusList []*SvcNamespaceStatus) error {
	t := template.New("svc_checker")
	t, err := t.Parse(
		`Cluster Service Status
  {{- range . }}
  Namespace: {{ .NamespaceName }}
  HealthService: {{ .EndpointCount }}/{{ .ServiceCount }}
  UnhealthyServiceList:
    {{- range .UnhealthyServiceList }}
    ServiceName: {{ . }}
    {{- end }}
  {{- end }}
`)
	if err != nil {
		panic(err)
	}
	t = template.Must(t, err)
	err = t.Execute(os.Stdout, svcNamespaceStatusList)
	if err != nil {
		logger.Error("service checkers template can not execute %s", err)
		return err
	}
	return nil
}

func IsExistEndpoint(endpointList *corev1.EndpointsList, serviceName string) bool {
	for _, ep := range endpointList.Items {
		if ep.Name == serviceName {
			if len(ep.Subsets) > 0 {
				return true
			}
		}
	}
	return false
}

func NewSvcChecker() Interface {
	return &SvcChecker{}
}
