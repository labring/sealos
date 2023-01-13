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

package checker

import (
	"context"
	"errors"
	"os"

	"github.com/labring/sealos/pkg/template"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/constants"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"

	corev1 "k8s.io/api/core/v1"
)

type SvcChecker struct {
	client kubernetes.Client
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
	data := constants.NewData(cluster.Name)
	c, err := kubernetes.NewKubernetesClient(data.AdminFile(), "")
	if err != nil {
		return err
	}

	n.client = c

	//namespaceSvcList, err := n.client.ListAllNamespacesSvcs()

	nsList, err := n.client.Kubernetes().CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return err
	}

	var svcNamespaceStatusList []*SvcNamespaceStatus
	if err != nil {
		return err
	}
	for _, svcNamespace := range nsList.Items {
		namespaceSVCList, err := n.client.Kubernetes().CoreV1().Services(svcNamespace.Name).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			break
		}

		namespaceEPList, err := n.client.Kubernetes().CoreV1().Endpoints(svcNamespace.Name).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			break
		}

		serviceCount := len(namespaceSVCList.Items)
		var unhaelthService []string
		var endpointCount = 0

		for _, service := range namespaceSVCList.Items {
			if IsExistEndpoint(namespaceEPList, service.Name) {
				endpointCount++
			} else {
				unhaelthService = append(unhaelthService, service.Name)
			}
		}
		svcNamespaceStatus := SvcNamespaceStatus{
			NamespaceName:       svcNamespace.Name,
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
	tpl, isOk, err := template.TryParse(`Cluster Service Status
  {{- range . }}
  Namespace: {{ .NamespaceName }}
  HealthService: {{ .EndpointCount }}/{{ .ServiceCount }}
  UnhealthServiceList:
    {{- range .UnhealthServiceList }}
    ServiceName: {{ . }}
    {{- end }}
  {{- end }}
`)
	if err != nil || !isOk {
		if err != nil {
			logger.Error("failed to render svc checkers template. error: %s", err.Error())
			return err
		}
		return errors.New("convert svc template failed")
	}
	if err = tpl.Execute(os.Stdout, svcNamespaceStatusList); err != nil {
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
