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
	"os"
	"testing"

	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	authorizationv1 "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/clientcmd"
	kubeletconfig "k8s.io/kubelet/config/v1beta1"
	"sigs.k8s.io/yaml"
)

func checkStandaloneKubeletPublication(t *testing.T, client clientset.Interface) {
	t.Helper()
	config := types.NewKubeadmConfig()
	if err := yaml.Unmarshal([]byte(`
maxPods: 123
cgroupDriver: systemd
imageGCHighThresholdPercent: 100
evictionHard:
  imagefs.available: 0%
  nodefs.available: 0%
  nodefs.inodesFree: 0%
rotateCertificates: true
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
authorization:
  mode: Webhook
`), &config.KubeletConfiguration); err != nil {
		t.Fatal(err)
	}
	runtime := &KubeadmRuntime{
		cli:           &stubKubeClient{k8s: client},
		kubeadmConfig: config,
	}
	// Publication and retry must work without any control-plane Node.
	for range 2 {
		if err := runtime.uploadStandaloneKubeletConfig(); err != nil {
			t.Fatal(err)
		}
	}
	cm, err := client.CoreV1().ConfigMaps(metav1.NamespaceSystem).
		Get(context.Background(), "kubelet-config", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	var actual kubeletconfig.KubeletConfiguration
	if err := yaml.Unmarshal([]byte(cm.Data["kubelet"]), &actual); err != nil {
		t.Fatal(err)
	}
	if actual.Kind != "KubeletConfiguration" ||
		actual.APIVersion != kubeletconfig.SchemeGroupVersion.String() ||
		actual.MaxPods != 123 ||
		!actual.RotateCertificates ||
		actual.Authentication.Webhook.Enabled == nil ||
		!*actual.Authentication.Webhook.Enabled ||
		actual.Authorization.Mode != kubeletconfig.KubeletAuthorizationModeWebhook {
		t.Fatalf("lost worker configuration: %s", cm.Data["kubelet"])
	}
}

func TestStandaloneKubeletPublicationWithoutNode(t *testing.T) {
	client := fake.NewSimpleClientset()
	checkStandaloneKubeletPublication(t, client)
	for _, action := range client.Actions() {
		if action.GetResource().Resource == "nodes" {
			t.Fatalf("worker config publication accessed a Node: %v", action)
		}
	}
}

// Run only against a disposable API with no Nodes. This creates the actual
// kubelet-config ConfigMap and RBAC, ready for a native kubeadm worker join.
func TestStandaloneKubeletPublicationE2E(t *testing.T) {
	path := os.Getenv("SEALOS_STANDALONE_INIT_CONFIG_E2E_KUBECONFIG")
	if path == "" {
		t.Skip("requires an explicitly selected disposable API without Nodes")
	}
	config, err := clientcmd.BuildConfigFromFlags("", path)
	if err != nil {
		t.Fatal(err)
	}
	client, err := clientset.NewForConfig(config)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	nodes, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil || len(nodes.Items) != 0 {
		t.Fatalf("requires a disposable API without Nodes: %v", err)
	}
	checkStandaloneKubeletPublication(t, client)
	for _, group := range []string{"system:nodes", "system:bootstrappers:kubeadm:default-node-token"} {
		for _, resource := range []string{"kubelet-config", "unrelated-config"} {
			review, err := client.AuthorizationV1().SubjectAccessReviews().Create(ctx,
				&authorizationv1.SubjectAccessReview{
					Spec: authorizationv1.SubjectAccessReviewSpec{
						User:   "config-publication-test",
						Groups: []string{group},
						ResourceAttributes: &authorizationv1.ResourceAttributes{
							Namespace: metav1.NamespaceSystem,
							Verb:      "get",
							Resource:  "configmaps",
							Name:      resource,
						},
					},
				}, metav1.CreateOptions{})
			if err != nil {
				t.Fatal(err)
			}
			if review.Status.Allowed != (resource == "kubelet-config") {
				t.Fatalf("unexpected access for %s to %s: %+v", group, resource, review.Status)
			}
		}
	}
}
