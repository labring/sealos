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

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"context"
	"fmt"
	"os"
	"text/template"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/logger"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	corev1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

const (
	ReadyNodeStatus    = "Ready"
	NotReadyNodeStatus = "NotReady"
)

type NodeChecker struct {
}

type NodeClusterStatus struct {
	ReadyCount       uint32
	NotReadyCount    uint32
	NodeCount        uint32
	NotReadyNodeList []string
}

func (n *NodeChecker) Check(cluster *v2.Cluster, phase string) error {
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
	var notReadyNodeList []string
	var readyCount uint32
	var nodeCount uint32
	var notReadyCount uint32
	for _, node := range nodes.Items {
		nodeIP, nodePhase := getNodeStatus(node)
		if nodePhase != ReadyNodeStatus {
			notReadyCount++
			notReadyNodeList = append(notReadyNodeList, nodeIP)
		} else {
			readyCount++
		}
	}
	nodeCount = notReadyCount + readyCount
	nodeClusterStatus := NodeClusterStatus{
		ReadyCount:       readyCount,
		NotReadyCount:    notReadyCount,
		NodeCount:        nodeCount,
		NotReadyNodeList: notReadyNodeList,
	}
	err = n.Output(nodeClusterStatus)
	if err != nil {
		return err
	}
	if notReadyCount != 0 {
		return fmt.Errorf("check node %v not ready", notReadyNodeList)
	}
	return nil
}

func (n *NodeChecker) Output(nodeCLusterStatus NodeClusterStatus) error {
	//t1, err := template.ParseFiles("templates/node_checker.tpl")
	t := template.New("node_checker")
	t, err := t.Parse(
		`Cluster Node Status
  ReadyNode: {{ .ReadyCount }}/{{ .NodeCount }}
  {{ if (gt .NotReadyCount 0 ) -}}
  Not Ready Node List:
    {{- range .NotReadyNodeList }}
    NodeIP: {{ . }}
    {{- end }}
  {{ end }}
`)
	if err != nil {
		panic(err)
	}
	t = template.Must(t, err)
	err = t.Execute(os.Stdout, nodeCLusterStatus)
	if err != nil {
		logger.Error("node checkers template can not excute %s", err)
		return err
	}
	return nil
}

func getNodeStatus(node corev1.Node) (IP string, Phase string) {
	if len(node.Status.Addresses) < 1 {
		return "", ""
	}
	for _, address := range node.Status.Addresses {
		if address.Type == "InternalIP" {
			IP = address.Address
		}
	}
	if IP == "" {
		IP = node.Status.Addresses[0].Address
	}
	Phase = NotReadyNodeStatus
	for _, condition := range node.Status.Conditions {
		if condition.Type == ReadyNodeStatus {
			if condition.Status == "True" {
				Phase = ReadyNodeStatus
			} else {
				Phase = NotReadyNodeStatus
			}
		}
	}
	return IP, Phase
}

func NewNodeChecker() Interface {
	return &NodeChecker{}
}
