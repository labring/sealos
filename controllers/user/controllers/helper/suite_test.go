/*
Copyright 2022 labring.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package helper

import (
	"context"
	"os"
	"testing"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	//+kubebuilder:scaffold:imports
)

// These tests use Ginkgo (BDD-style Go testing framework). Refer to
// http://onsi.github.io/ginkgo/ to learn more about Ginkgo.

func TestUtils(t *testing.T) {
	RegisterFailHandler(Fail)

	RunSpecs(t, "run helper suite")
}

var _ = Describe("user kubeconfig ", func() {
	Context("syncReNewConfig test", func() {
		BeforeEach(func() {
			client, _ := kubernetes.NewKubernetesClient("", "")
			rb := &rbacv1.RoleBinding{
				ObjectMeta: metav1.ObjectMeta{
					Name: "cuisongliu-rolebinding",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:      "User",
						Name:      "cuisongliu",
						Namespace: "default",
						APIGroup:  "rbac.authorization.k8s.io",
					},
				},
				RoleRef: rbacv1.RoleRef{
					Kind:     "ClusterRole",
					Name:     "cluster-admin",
					APIGroup: "rbac.authorization.k8s.io",
				},
			}
			_, _ = client.Kubernetes().RbacV1().RoleBindings("default").Create(context.TODO(), rb, metav1.CreateOptions{})

		})
		AfterEach(func() {
			client, _ := kubernetes.NewKubernetesClient("", "")
			_ = client.Kubernetes().RbacV1().RoleBindings("default").Delete(context.TODO(), "cuisongliu-rolebinding", metav1.DeleteOptions{})
			_ = os.RemoveAll("output")
		})
		It("empty csr generate", func() {
			gen := NewGenerate(&Config{
				User:        "cuisongliu",
				DNSNames:    []string{"apiserver.cluster.local"},
				IPAddresses: nil,
			})
			By("start to get kubeconfig")
			config, err := gen.KubeConfig()
			Expect(err).To(BeNil())
			Expect(config).NotTo(BeNil())
			kubeData, err := clientcmd.Write(*config)
			Expect(err).To(BeNil())
			Expect(kubeData).NotTo(BeNil())
			By("start to write kubeconfig")
			err = os.WriteFile("output", kubeData, 0600)
			Expect(err).To(BeNil())
			cli, _ := kubernetes.NewKubernetesClient("output", "")
			_, err = cli.Kubernetes().CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
			Expect(err).To(BeNil())
			_, err = cli.Kubernetes().CoreV1().Pods("kube-system").List(context.TODO(), metav1.ListOptions{})
			errStatus := errors.ReasonForError(err)
			Expect(err).NotTo(BeNil())
			Expect(errStatus).To(Equal(metav1.StatusReasonForbidden))
		})
	})
})
