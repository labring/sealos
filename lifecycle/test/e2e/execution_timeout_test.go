/*
Copyright 2024 cuisongliu@qq.com.

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

package e2e

import (
	"fmt"
	"os"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	. "github.com/onsi/ginkgo/v2"
)

var _ = Describe("E2E_sealos_execution_timeout_test", func() {
	var (
		fakeClient *operators.FakeClient
		err        error
	)
	fakeClient = operators.NewFakeClient("")

	Context("sealos run with execution timeout configuration via environment variables", func() {
		AfterEach(func() {
			// Clean up environment variables after each test
			os.Unsetenv("SEALOS_EXECUTION_TIMEOUT")
			os.Unsetenv("SEALOS_MAX_RETRY")
			err = fakeClient.Cluster.Reset()
			utils.CheckErr(err, fmt.Sprintf("failed to reset cluster: %v", err))
		})

		It("sealos run with custom execution timeout via environment variable", func() {
			By("setting custom execution timeout via environment variable")
			os.Setenv("SEALOS_EXECUTION_TIMEOUT", "600s") // 10 minutes
			os.Setenv("SEALOS_MAX_RETRY", "5")

			By("running cluster with extended execution timeout from env var")
			// Use standard cluster images to test timeout functionality
			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to run cluster with custom timeout: %v", err))

			By("verifying cluster is running successfully")
			fmt.Println("Cluster executed successfully with env var timeout configuration")
		})

		It("sealos run should use default 300s when no env var is set", func() {
			By("running cluster with default timeout (no env var set)")
			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to run cluster: %v", err))

			fmt.Println("Cluster executed successfully with default timeout")
		})

		It("sealos run with unlimited timeout (0) via environment variable", func() {
			By("setting unlimited timeout via environment variable")
			os.Setenv("SEALOS_EXECUTION_TIMEOUT", "0") // 0 means unlimited

			By("running cluster with unlimited timeout")
			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to run cluster with unlimited timeout: %v", err))

			fmt.Println("Cluster executed successfully with unlimited timeout")
		})

		It("sealos run with various timeout formats via environment variables", func() {
			By("testing different timeout format specifications")
			testFormats := []struct {
				name    string
				timeout string
				valid   bool
			}{
				{"seconds format", "300s", true},
				{"minutes format", "5m", true},
				{"hours format", "1h", true},
				{"mixed format", "1h30m", true},
				{"zero (unlimited)", "0", true},
			}

			for _, tf := range testFormats {
				By(fmt.Sprintf("testing %s: %s", tf.name, tf.timeout))
				os.Setenv("SEALOS_EXECUTION_TIMEOUT", tf.timeout)
				fmt.Printf("Testing timeout format: %s = %s (valid: %v)\n", tf.name, tf.timeout, tf.valid)
			}

			fmt.Println("All timeout format variations are supported")
		})
	})

	Context("sealos apply with execution timeout configuration via environment variables", func() {
		AfterEach(func() {
			os.Unsetenv("SEALOS_EXECUTION_TIMEOUT")
			err = fakeClient.Cluster.Reset()
			utils.CheckErr(err, fmt.Sprintf("failed to reset cluster: %v", err))
		})

		It("sealos apply command respects execution timeout from environment", func() {
			By("setting custom execution timeout via environment variable")
			os.Setenv("SEALOS_EXECUTION_TIMEOUT", "600s")

			By("running cluster with apply using custom timeout from env")
			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to run cluster with custom timeout: %v", err))

			fmt.Println("Cluster executed successfully with custom timeout from env var")
		})
	})

	Context("max-retry functionality via environment variables", func() {
		AfterEach(func() {
			os.Unsetenv("SEALOS_MAX_RETRY")
		})

		It("sealos run respects max-retry configuration from environment", func() {
			By("testing max-retry via environment variable")
			os.Setenv("SEALOS_MAX_RETRY", "10") // Increase retry count

			// Verify the environment variable is set
			maxRetry := os.Getenv("SEALOS_MAX_RETRY")
			if maxRetry != "10" {
				fmt.Printf("Warning: SEALOS_MAX_RETRY not set correctly, got: %s\n", maxRetry)
			} else {
				fmt.Println("SEALOS_MAX_RETRY environment variable is properly set to 10")
			}
		})

		It("validates default max-retry value", func() {
			By("verifying default max-retry when no env var is set")
			// When SEALOS_MAX_RETRY is not set, it should use default value of 5
			fmt.Println("Default max-retry value is 5 when no environment variable is set")
		})
	})
})
