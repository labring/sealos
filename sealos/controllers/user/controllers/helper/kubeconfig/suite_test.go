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

package kubeconfig

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	csrv1 "k8s.io/api/certificates/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	"k8s.io/client-go/tools/clientcmd"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	//+kubebuilder:scaffold:imports
)

// These tests use Ginkgo (BDD-style Go testing framework). Refer to
// http://onsi.github.io/ginkgo/ to learn more about Ginkgo.
var cfg *rest.Config
var k8sClient client.Client
var testEnv *envtest.Environment

func TestUtils(t *testing.T) {
	RegisterFailHandler(Fail)

	RunSpecs(t, "run helper suite")
}

var _ = BeforeSuite(func() {
	logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))

	By("bootstrapping test environment")
	truePtr := true
	testEnv = &envtest.Environment{
		UseExistingCluster:    &truePtr,
		CRDDirectoryPaths:     []string{filepath.Join("../../", "config", "crd", "bases")},
		ErrorIfCRDPathMissing: true,
	}

	var err error
	// cfg is defined in this file globally.
	cfg, err = testEnv.Start()
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg).NotTo(BeNil())

	err = csrv1.AddToScheme(scheme.Scheme)
	Expect(err).NotTo(HaveOccurred())

	//+kubebuilder:scaffold:scheme

	k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())

}, 60)

var _ = AfterSuite(func() {
	By("tearing down the test environment")
	err := testEnv.Stop()
	Expect(err).NotTo(HaveOccurred())
})

var _ = Describe("user kubeconfig ", func() {
	Context("syncReNewConfig test", func() {
		BeforeEach(func() {
			clientSet, _ := kubernetes.NewForConfig(cfg)
			rb := &rbacv1.RoleBinding{
				ObjectMeta: metav1.ObjectMeta{
					Name: "cuisongliu-rolebinding",
				},
				Subjects: []rbacv1.Subject{
					{
						Kind:      "user",
						Name:      "cuisongliu",
						Namespace: "default",
						APIGroup:  "rbac.authorization.k8s.io",
					},
					{
						Kind:      "ServiceAccount",
						Name:      "cuisongliu",
						Namespace: "user-system",
					},
				},
				RoleRef: rbacv1.RoleRef{
					Kind:     "ClusterRole",
					Name:     "cluster-admin",
					APIGroup: "rbac.authorization.k8s.io",
				},
			}

			_, err := clientSet.RbacV1().RoleBindings("default").Create(context.TODO(), rb, metav1.CreateOptions{})
			Expect(err).NotTo(HaveOccurred())

		})
		AfterEach(func() {
			clientSet, _ := kubernetes.NewForConfig(cfg)
			_ = clientSet.RbacV1().RoleBindings("default").Delete(context.TODO(), "cuisongliu-rolebinding", metav1.DeleteOptions{})
			_ = os.RemoveAll("output")
		})
		It("empty csr generate", func() {
			defaultConfig := NewConfig("cuisongliu", "", 100000000)
			gen := defaultConfig.WithCsrConfig([]string{}, []string{"apiserver.cluster.local"}, nil, nil)
			By("start to get kubeconfig")
			config, err := gen.Apply(cfg, k8sClient)
			Expect(err).To(BeNil())
			Expect(config).NotTo(BeNil())
			if info, ok := config.AuthInfos["cuisongliu"]; ok {
				if info != nil {
					cert, err := DecodeX509CertificateBytes(info.ClientCertificateData)
					if err != nil {
						Expect(err).To(BeNil())
					}
					if cert.NotAfter.Before(time.Now()) {
						config = nil
						By(fmt.Sprintf("ClientCertificateData %s is expired", "cuisongliu"))
						return
					}
					By(fmt.Sprintf("Cert NotAfter is  %s", cert.NotAfter.String()))
				}
			}

			kubeData, err := clientcmd.Write(*config)
			Expect(err).To(BeNil())
			Expect(kubeData).NotTo(BeNil())
			By("start to write kubeconfig")
			err = os.WriteFile("output", kubeData, 0600)
			Expect(err).To(BeNil())

			newCfg, err := clientcmd.BuildConfigFromFlags("", "output")
			Expect(err).To(BeNil())
			Expect(newCfg).NotTo(BeNil())
			newCfg.QPS = 1e6
			newCfg.Burst = 1e6
			clientSet, err := kubernetes.NewForConfig(newCfg)
			Expect(err).To(BeNil())
			_, err = clientSet.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
			Expect(err).To(BeNil())
			_, err = clientSet.CoreV1().Pods("kube-system").List(context.TODO(), metav1.ListOptions{})
			errStatus := errors.ReasonForError(err)
			Expect(err).NotTo(BeNil())
			Expect(errStatus).To(Equal(metav1.StatusReasonForbidden))
		})
		It("token generate", func() {
			defaultConfig := NewConfig("cuisongliu", "", 100000000)
			gen := defaultConfig.WithServiceAccountConfig("test", nil)
			By("start to get kubeconfig")
			config, err := gen.Apply(cfg, k8sClient)
			Expect(err).To(BeNil())
			Expect(config).NotTo(BeNil())
			kubeData, err := clientcmd.Write(*config)
			Expect(err).To(BeNil())
			Expect(kubeData).NotTo(BeNil())
			By("start to write kubeconfig")
			err = os.WriteFile("output", kubeData, 0600)
			Expect(err).To(BeNil())

			newCfg, err := clientcmd.BuildConfigFromFlags("", "output")
			Expect(err).To(BeNil())
			Expect(newCfg).NotTo(BeNil())
			newCfg.QPS = 1e6
			newCfg.Burst = 1e6
			clientSet, err := kubernetes.NewForConfig(newCfg)
			Expect(err).To(BeNil())
			_, err = clientSet.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
			Expect(err).To(BeNil())
			_, err = clientSet.CoreV1().Pods("kube-system").List(context.TODO(), metav1.ListOptions{})
			errStatus := errors.ReasonForError(err)
			Expect(err).NotTo(BeNil())
			Expect(errStatus).To(Equal(metav1.StatusReasonForbidden))
		})
		It("webhook generate", func() {
			defaultConfig := NewConfig("cuisongliu", "", 100000000)
			gen := defaultConfig.WithWebhookConfigConfig("https://192.168.64.1:6443")
			By("start to get kubeconfig")
			config, err := gen.Apply(cfg, k8sClient)
			Expect(err).To(BeNil())
			Expect(config).NotTo(BeNil())
			kubeData, err := clientcmd.Write(*config)
			Expect(err).To(BeNil())
			Expect(kubeData).NotTo(BeNil())
			By("start to write kubeconfig")
			err = os.WriteFile("output-webhook", kubeData, 0600)
			Expect(err).To(BeNil())
		})
	})
})
