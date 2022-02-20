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

type PodChecker struct {
	client *kubernetes.Client
}

type PodNamespaceStatus struct {
	NamespaceName     string
	RunningCount      uint32
	NotRunningCount   uint32
	PodCount          uint32
	NotRunningPodList []*corev1.Pod
}

var PodNamespaceStatusList []PodNamespaceStatus

func (n *PodChecker) Check(cluster *v2.Cluster, phase string) error {
	if phase != PhasePost {
		return nil
	}
	c, err := kubernetes.Newk8sClient()
	if err != nil {
		return err
	}
	n.client = c

	namespacePodList, err := n.client.ListAllNamespacesPods()
	if err != nil {
		return err
	}
	for _, podNamespace := range namespacePodList {
		var runningCount uint32
		var notRunningCount uint32
		var podCount uint32
		var notRunningPodList []*corev1.Pod
		for _, pod := range podNamespace.PodList.Items {
			if err := getPodReadyStatus(pod); err != nil {
				notRunningCount++
				newPod := pod
				notRunningPodList = append(notRunningPodList, &newPod)
			} else {
				runningCount++
			}
		}
		podCount = runningCount + notRunningCount
		podNamespaceStatus := PodNamespaceStatus{
			NamespaceName:     podNamespace.Namespace.Name,
			RunningCount:      runningCount,
			NotRunningCount:   notRunningCount,
			PodCount:          podCount,
			NotRunningPodList: notRunningPodList,
		}
		PodNamespaceStatusList = append(PodNamespaceStatusList, podNamespaceStatus)
	}
	err = n.Output(PodNamespaceStatusList)
	if err != nil {
		return err
	}
	return nil
}

func (n *PodChecker) Output(podNamespaceStatusList []PodNamespaceStatus) error {
	t := template.New("pod_checker")
	t, err := t.Parse(
		`Cluster Pod Status
  {{ range . -}}
  Namespace: {{ .NamespaceName }}
  RunningPod: {{ .RunningCount }}/{{ .PodCount }}
  {{ if (gt .NotRunningCount 0) -}}
  Not Running Pod List:
    {{- range .NotRunningPodList }}
    PodName: {{ .Name }}
    {{- end }}
  {{ end }}
  {{- end }}
`)
	if err != nil {
		panic(err)
	}
	t = template.Must(t, err)
	err = t.Execute(os.Stdout, podNamespaceStatusList)
	if err != nil {
		logger.Error("pod checkers template can not excute %s", err)
		return err
	}
	return nil
}

func getPodReadyStatus(pod corev1.Pod) error {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == "Ready" {
			if condition.Status == "True" {
				return nil
			}
		}
	}
	return &NotFindReadyTypeError{}
}

func NewPodChecker() Interface {
	return &PodChecker{}
}
