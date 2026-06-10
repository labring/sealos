package kubernetes

import (
	"context"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"

	clientkubernetes "github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	v1beta1 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestSyncLocalAdminKubeConfigCopies(t *testing.T) {
	rootDir := t.TempDir()
	prevRuntimeRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = rootDir
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = prevRuntimeRoot
	})

	stub := &stubSSH{
		cmdToStringResponses: map[string]string{
			"master0|echo $HOME": "/root/master0",
			"master1|echo $HOME": "/root/master1",
			"node0|echo $HOME":   "/home/node0",
		},
	}
	rt := &KubeadmRuntime{
		execer:       stub,
		cluster:      testClusterWithNodes([]string{"master0", "master1"}, []string{"node0"}),
		pathResolver: constants.NewPathResolver("test-cluster"),
	}

	if err := rt.syncLocalAdminKubeConfigCopies(); err != nil {
		t.Fatalf("syncLocalAdminKubeConfigCopies() error = %v", err)
	}

	want := []string{
		"master0|" + filepath.Join(rootDir, "test-cluster", "etc", "admin.conf") + "|/root/master0/.kube/config",
		"master1|" + filepath.Join(rootDir, "test-cluster", "etc", "admin.conf") + "|/root/master1/.kube/config",
		"node0|" + filepath.Join(rootDir, "test-cluster", "etc", "admin.conf") + "|/home/node0/.kube/config",
	}
	sort.Strings(want)
	got := append([]string{}, stub.copyCalls...)
	sort.Strings(got)
	if len(stub.copyCalls) != len(want) {
		t.Fatalf("syncLocalAdminKubeConfigCopies() copyCalls = %v, want %v", stub.copyCalls, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("syncLocalAdminKubeConfigCopies() copyCalls = %v, want %v", got, want)
		}
	}
}

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
