// Copyright © 2021 cuisongliu@qq.com.
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

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"context"
	"errors"
	"os"
	"time"

	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/template"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type ClusterChecker struct {
}

type ClusterStatus struct {
	IP                    string
	Node                  string
	KubeAPIServer         string
	KubeControllerManager string
	KubeScheduler         string
	KubeletErr            string
}

func (n *ClusterChecker) Check(cluster *v2.Cluster, phase string) error {
	if phase != PhasePost {
		return nil
	}

	// checker if all the node is ready
	data := constants.NewPathResolver(cluster.Name)
	c, err := kubernetes.NewKubernetesClient(data.AdminFile(), "")
	if err != nil {
		return err
	}
	ke := kubernetes.NewKubeExpansion(c.Kubernetes())
	nodes, err := c.Kubernetes().CoreV1().Nodes().List(context.Background(), v1.ListOptions{})
	if err != nil {
		return err
	}
	healthyClient := kubernetes.NewKubeHealthy(c.Kubernetes(), 30*time.Second)
	var NodeList []ClusterStatus
	ctx := context.Background()
	for _, node := range nodes.Items {
		ip, _ := getNodeStatus(node)
		cStatus := ClusterStatus{
			IP:   ip,
			Node: node.Name,
		}
		if isControlPlaneNode(node) {
			apiPod, err := ke.FetchStaticPod(ctx, node.Name, kubernetes.KubeAPIServer)
			if err != nil {
				return err
			}
			cStatus.KubeAPIServer = healthyClient.ForHealthyPod(apiPod)

			controllerPod, err := ke.FetchStaticPod(ctx, node.Name, kubernetes.KubeControllerManager)
			if err != nil {
				return err
			}
			cStatus.KubeControllerManager = healthyClient.ForHealthyPod(controllerPod)

			schedulerPod, err := ke.FetchStaticPod(ctx, node.Name, kubernetes.KubeScheduler)
			if err != nil {
				return err
			}
			cStatus.KubeScheduler = healthyClient.ForHealthyPod(schedulerPod)
		}

		if err = healthyClient.ForHealthyKubelet(5*time.Second, ip); err != nil {
			cStatus.KubeletErr = err.Error()
		} else {
			cStatus.KubeletErr = Nil
		}
		NodeList = append(NodeList, cStatus)
	}

	return n.Output(NodeList)
}

func isControlPlaneNode(node corev1.Node) bool {
	if _, ok := node.Labels["node-role.kubernetes.io/control-plane"]; ok {
		return true
	}
	if _, ok := node.Labels["node-role.kubernetes.io/master"]; ok {
		return true
	}
	return false
}

func (n *ClusterChecker) Output(clusterStatus []ClusterStatus) error {
	tpl, isOk, err := template.TryParse(`
Cluster Status
  Node List:
    {{- range .ClusterStatusList }}
	NodeName: {{ .Node }}
		NodeIP: {{ .IP }}
		KubeAPIServer: {{ .KubeAPIServer }}
		KubeControllerManager: {{ .KubeControllerManager }}
		KubeScheduler: {{ .KubeScheduler }}
		KubeletErr: {{.KubeletErr}}
    {{- end }}
`)
	if err != nil || !isOk {
		if err != nil {
			logger.Error("failed to render cluster checkers template. error: %s", err.Error())
			return err
		}
		return errors.New("convert cluster template failed")
	}
	return tpl.Execute(os.Stdout, map[string][]ClusterStatus{"ClusterStatusList": clusterStatus})
}

func NewClusterChecker() Interface {
	return &ClusterChecker{}
}
