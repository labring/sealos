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
	"bytes"
	"io"
	"os"
	"strings"
	"testing"

	corev1 "k8s.io/api/core/v1"
)

func TestNodeChecker_Output(t *testing.T) {
	tests := []struct {
		name    string
		status  NodeClusterStatus
		want    string
		wantErr bool
	}{
		{
			name: "all nodes ready",
			status: NodeClusterStatus{
				ReadyCount:       3,
				NotReadyCount:    0,
				NodeCount:        3,
				NotReadyNodeList: []string{},
			},
			want: `
Cluster Node Status
  ReadyNode: 3/3`,
			wantErr: false,
		},
		{
			name: "some nodes not ready",
			status: NodeClusterStatus{
				ReadyCount:       2,
				NotReadyCount:    2,
				NodeCount:        4,
				NotReadyNodeList: []string{"192.168.1.10", "192.168.1.11"},
			},
			want: `
Cluster Node Status
  ReadyNode: 2/4
  Not Ready Node List:
    NodeIP: 192.168.1.10
    NodeIP: 192.168.1.11`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			n := &NodeChecker{}
			old := os.Stdout
			r, w, _ := os.Pipe()
			os.Stdout = w

			err := n.Output(tt.status)
			w.Close()

			var buf bytes.Buffer
			io.Copy(&buf, r)
			os.Stdout = old

			if (err != nil) != tt.wantErr {
				t.Errorf("Output() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			got := strings.TrimSpace(buf.String())
			want := strings.TrimSpace(tt.want)
			if got != want {
				t.Errorf("Output() = %v, want %v", got, want)
			}
		})
	}
}

func TestGetNodeStatus(t *testing.T) {
	tests := []struct {
		name      string
		node      corev1.Node
		wantIP    string
		wantPhase string
	}{
		{
			name: "ready node with internal IP",
			node: corev1.Node{
				Status: corev1.NodeStatus{
					Addresses: []corev1.NodeAddress{
						{
							Type:    "InternalIP",
							Address: "192.168.1.10",
						},
						{
							Type:    "Hostname",
							Address: "node1",
						},
					},
					Conditions: []corev1.NodeCondition{
						{
							Type:   "Ready",
							Status: "True",
						},
					},
				},
			},
			wantIP:    "192.168.1.10",
			wantPhase: ReadyNodeStatus,
		},
		{
			name: "not ready node",
			node: corev1.Node{
				Status: corev1.NodeStatus{
					Addresses: []corev1.NodeAddress{
						{
							Type:    "InternalIP",
							Address: "192.168.1.11",
						},
					},
					Conditions: []corev1.NodeCondition{
						{
							Type:   "Ready",
							Status: "False",
						},
					},
				},
			},
			wantIP:    "192.168.1.11",
			wantPhase: NotReadyNodeStatus,
		},
		{
			name: "no internal IP",
			node: corev1.Node{
				Status: corev1.NodeStatus{
					Addresses: []corev1.NodeAddress{
						{
							Type:    "Hostname",
							Address: "node1",
						},
					},
					Conditions: []corev1.NodeCondition{
						{
							Type:   "Ready",
							Status: "True",
						},
					},
				},
			},
			wantIP:    "node1",
			wantPhase: ReadyNodeStatus,
		},
		{
			name: "no addresses",
			node: corev1.Node{
				Status: corev1.NodeStatus{
					Conditions: []corev1.NodeCondition{
						{
							Type:   "Ready",
							Status: "True",
						},
					},
				},
			},
			wantIP:    "",
			wantPhase: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotIP, gotPhase := getNodeStatus(tt.node)
			if gotIP != tt.wantIP {
				t.Errorf("getNodeStatus() gotIP = %v, want %v", gotIP, tt.wantIP)
			}
			if gotPhase != tt.wantPhase {
				t.Errorf("getNodeStatus() gotPhase = %v, want %v", gotPhase, tt.wantPhase)
			}
		})
	}
}
