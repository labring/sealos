// Copyright © 2023 sealos.
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

package controllers

import (
	"testing"
	"time"

	"github.com/go-logr/logr"
	"github.com/labring/sealos/controllers/pkg/resources"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestMonitorPodResourceUsageHandlesOptionalStartTime(t *testing.T) {
	recent := metav1.NewTime(time.Now().Add(-10 * time.Second))
	old := metav1.NewTime(time.Now().Add(-2 * time.Minute))
	for _, tt := range []struct {
		name    string
		phase   corev1.PodPhase
		start   *metav1.Time
		node    string
		wantCPU string
	}{
		{name: "completed without start time", phase: corev1.PodSucceeded, node: "node-a", wantCPU: "0"},
		{name: "recent completed", phase: corev1.PodSucceeded, start: &recent, node: "node-a", wantCPU: "1"},
		{name: "old completed", phase: corev1.PodSucceeded, start: &old, node: "node-a", wantCPU: "0"},
		{name: "running without start time", phase: corev1.PodRunning, node: "node-a", wantCPU: "1"},
		{name: "pending without start time", phase: corev1.PodPending, node: "node-a", wantCPU: "0"},
		{name: "unscheduled", phase: corev1.PodRunning, wantCPU: "0"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			if err := corev1.AddToScheme(scheme); err != nil {
				t.Fatal(err)
			}
			pod := &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{Name: "pod-a", Namespace: "ns-a"},
				Spec: corev1.PodSpec{
					NodeName: tt.node,
					Containers: []corev1.Container{{
						Name: "app",
						Resources: corev1.ResourceRequirements{
							Requests: corev1.ResourceList{
								corev1.ResourceCPU: resource.MustParse("1"),
							},
						},
					}},
				},
				Status: corev1.PodStatus{Phase: tt.phase, StartTime: tt.start},
			}
			r := &MonitorReconciler{
				cache:  fake.NewClientBuilder().WithScheme(scheme).WithObjects(pod).Build(),
				Logger: logr.Discard(),
			}
			used := map[string]map[corev1.ResourceName]*quantity{}
			named := map[string]*resources.ResourceNamed{}
			if err := r.monitorPodResourceUsage("ns-a", used, named, nil); err != nil {
				t.Fatal(err)
			}
			total := resource.MustParse("0")
			for _, usage := range used {
				total.Add(*usage[corev1.ResourceCPU].Quantity)
			}
			if want := resource.MustParse(tt.wantCPU); total.Cmp(want) != 0 {
				t.Fatalf("CPU usage = %s, want %s", total.String(), want.String())
			}
		})
	}
}
