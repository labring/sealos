/*
Copyright 2023.

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

package controllers

import (
	"path/filepath"
	"testing"
	"time"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	//+kubebuilder:scaffold:imports
)

// These tests use Ginkgo (BDD-style Go testing framework). Refer to
// http://onsi.github.io/ginkgo/ to learn more about Ginkgo.

var cfg *rest.Config
var k8sClient client.Client
var testEnv *envtest.Environment

func TestAPIs(t *testing.T) {
	RegisterFailHandler(Fail)

	RunSpecsWithDefaultAndCustomReporters(t, "Controller Suite", []Reporter{})
}

var _ = BeforeSuite(func() {
	logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))

	By("bootstrapping test environment")
	testEnv = &envtest.Environment{
		CRDDirectoryPaths:     []string{filepath.Join("..", "config", "crd", "bases")},
		ErrorIfCRDPathMissing: true,
	}

	var err error
	// cfg is defined in this file globally.
	cfg, err = testEnv.Start()
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg).NotTo(BeNil())

	err = accountv1.AddToScheme(scheme.Scheme)
	Expect(err).NotTo(HaveOccurred())

	err = corev1.AddToScheme(scheme.Scheme)
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

func TestCalculateBillingHours(t *testing.T) {
	//lastUpdateTime := time.Date(2021, 11, 1, 10, 35, 20, 0, time.UTC)
	//currentHourTime := time.Date(2021, 11, 1, 14, 0, 0, 0, time.UTC)

	lastUpdateTime := time.Date(2021, 11, 1, 10, 0, 0, 0, time.UTC)
	currentHourTime := time.Date(2021, 11, 1, 14, 0, 0, 0, time.UTC)
	//lastUpdateTime := time.Date(2021, 11, 1, 14, 0, 0, 0, time.UTC)
	//currentHourTime := time.Date(2021, 11, 1, 14, 0, 0, 0, time.UTC)

	expected := []time.Time{
		time.Date(2021, 11, 1, 11, 0, 0, 0, time.UTC),
		time.Date(2021, 11, 1, 12, 0, 0, 0, time.UTC),
		time.Date(2021, 11, 1, 13, 0, 0, 0, time.UTC),
		time.Date(2021, 11, 1, 14, 0, 0, 0, time.UTC),
	}

	result := CalculateBillingHours(lastUpdateTime, currentHourTime)

	if len(result) != len(expected) {
		t.Fatalf("expected %d billing hours, but got %d", len(expected), len(result))
	}

	for i := range result {
		if !result[i].Equal(expected[i]) {
			t.Errorf("expected billing hour %v, but got %v", expected[i], result[i])
		}
	}
}

func CalculateBillingHours(lastUpdateTime, currentHourTime time.Time) []time.Time {
	needBillingHours := make([]time.Time, 0)
	for t := lastUpdateTime.Truncate(time.Hour).Add(time.Hour); t.Before(currentHourTime) || t.Equal(currentHourTime); t = t.Add(time.Hour) {
		needBillingHours = append(needBillingHours, t)
	}
	return needBillingHours
}
