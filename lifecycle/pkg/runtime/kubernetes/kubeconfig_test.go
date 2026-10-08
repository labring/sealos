// Copyright © 2026 sealos.
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

package kubernetes

import (
	"context"
	"strings"
	"sync"
	"testing"

	clientkubernetes "github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/ssh"
	v1beta1 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestDeleteStaticPodMissingContainerError(t *testing.T) {
	stub := &stubSSH{
		cmdToStringResponses: map[string]string{
			"master0|crictl ps -a --name kube-scheduler -o json": `{"containers":[]}`,
		},
	}
	rt := &KubeadmRuntime{
		execer:  stub,
		cluster: testCluster([]string{"master0"}),
	}

	err := rt.deleteStaticPod(clientkubernetes.KubeScheduler)
	if err == nil {
		t.Fatal("expected deleteStaticPod to fail when no container is returned")
	}
	if !strings.Contains(err.Error(), "not found static pod running") {
		t.Fatalf("deleteStaticPod() error = %v, want missing static pod error", err)
	}
}

type stubSSH struct {
	cmdToStringResponses map[string]string
	copyCalls            []string
	mu                   sync.Mutex
}

var _ ssh.Interface = (*stubSSH)(nil)

func (s *stubSSH) Copy(host, src, dst string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.copyCalls = append(s.copyCalls, host+"|"+src+"|"+dst)
	return nil
}

func (s *stubSSH) Fetch(host, src, dst string) error { return nil }

func (s *stubSSH) CmdAsync(host string, cmds ...string) error { return nil }

func (s *stubSSH) CmdAsyncWithContext(ctx context.Context, host string, cmds ...string) error {
	return nil
}

func (s *stubSSH) Cmd(host, cmd string) ([]byte, error) { return nil, nil }

func (s *stubSSH) CmdToString(host, cmd, spilt string) (string, error) {
	if got, ok := s.cmdToStringResponses[host+"|"+cmd]; ok {
		return got, nil
	}
	return "", nil
}

func (s *stubSSH) Ping(host string) error { return nil }

func testCluster(masters []string) *v1beta1.Cluster {
	return testClusterWithNodes(masters, nil)
}

func testClusterWithNodes(masters, nodes []string) *v1beta1.Cluster {
	host := v1beta1.Host{
		Roles: []string{v1beta1.MASTER},
		IPS:   masters,
	}
	hosts := []v1beta1.Host{host}
	if len(nodes) != 0 {
		hosts = append(hosts, v1beta1.Host{
			Roles: []string{v1beta1.NODE},
			IPS:   nodes,
		})
	}
	return &v1beta1.Cluster{
		Spec: v1beta1.ClusterSpec{
			Hosts: hosts,
		},
	}
}
