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

package kubernetes

import (
	"path/filepath"
	"testing"

	"k8s.io/client-go/util/homedir"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"k8s.io/client-go/rest"
	//+kubebuilder:scaffold:imports
)

// These tests use Ginkgo (BDD-style Go testing framework). Refer to
// http://onsi.github.io/ginkgo/ to learn more about Ginkgo.

var cfg *rest.Config
var k8sClient Client

func TestAPIs(t *testing.T) {
	RegisterFailHandler(Fail)

	RunSpecs(t, "run client go suite")
}

var _ = BeforeSuite(func() {

	var err error
	//+kubebuilder:scaffold:scheme
	k8sClient, err = NewKubernetesClient("", "")
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())
	cfg = k8sClient.Config()
	Expect(cfg).NotTo(BeNil())

	subconfigPath := filepath.Join(homedir.HomeDir(), ".kube", "config")
	k8sClient, err = NewKubernetesClient(subconfigPath, "")
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())
	cfg = k8sClient.Config()
	Expect(cfg).NotTo(BeNil())

	k8sClient, err = NewKubernetesClient("", "https://127.0.0.1:6443")
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())
	cfg = k8sClient.Config()
	Expect(cfg).NotTo(BeNil())

}, 60)

var _ = AfterSuite(func() {
	By("tearing down the test environment")
})
