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
	"os"
	"text/template"
	"time"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/logger"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
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
	data := constants.NewData(cluster.Name)
	c, err := kubernetes.NewKubernetesClient(data.AdminFile(), cluster.GetMaster0IPAPIServer())
	if err != nil {
		return err
	}
	nodes, err := c.Kubernetes().CoreV1().Nodes().List(context.Background(), v1.ListOptions{})
	if err != nil {
		return err
	}
	healthyClient := kubernetes.NewKubeHealthy(c.Kubernetes(), 30*time.Second)
	var NodeList []ClusterStatus
	for _, node := range nodes.Items {
		ip, _ := getNodeStatus(node)
		cStatus := ClusterStatus{
			IP:   ip,
			Node: node.Name,
		}
		apiPod, err := kubernetes.GetStaticPod(c.Kubernetes(), node.Name, kubernetes.KubeAPIServer)
		if err != nil {
			return err
		}
		cStatus.KubeAPIServer = healthyClient.ForHealthyPod(apiPod)

		controllerPod, err := kubernetes.GetStaticPod(c.Kubernetes(), node.Name, kubernetes.KubeControllerManager)
		if err != nil {
			return err
		}
		cStatus.KubeControllerManager = healthyClient.ForHealthyPod(controllerPod)

		schedulerPod, err := kubernetes.GetStaticPod(c.Kubernetes(), node.Name, kubernetes.KubeScheduler)
		if err != nil {
			return err
		}
		cStatus.KubeScheduler = healthyClient.ForHealthyPod(schedulerPod)

		if err = healthyClient.ForHealthyKubelet(10*time.Second, ip); err != nil {
			cStatus.KubeletErr = err.Error()
		} else {
			cStatus.KubeletErr = "<nil>"
		}
		NodeList = append(NodeList, cStatus)
	}

	return n.Output(NodeList)
}

func (n *ClusterChecker) Output(clusterStatus []ClusterStatus) error {
	//t1, err := template.ParseFiles("templates/node_checker.tpl")
	t := template.New("cluster_checker")
	t, err := t.Parse(
		`Cluster Status
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
	if err != nil {
		panic(err)
	}
	t = template.Must(t, err)
	err = t.Execute(os.Stdout, map[string][]ClusterStatus{"ClusterStatusList": clusterStatus})
	if err != nil {
		logger.Error("node checkers template can not excute %s", err)
		return err
	}
	return nil
}

func NewClusterChecker() Interface {
	return &ClusterChecker{}
}
