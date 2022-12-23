/*
Copyright 2018 The Kubernetes Authors.

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
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/labring/sealos/pkg/utils/logger"

	v1 "k8s.io/api/core/v1"

	"github.com/pkg/errors"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	netutil "k8s.io/apimachinery/pkg/util/net"
	"k8s.io/apimachinery/pkg/util/wait"
	clientset "k8s.io/client-go/kubernetes"
)

// Healthy is an interface for waiting for criteria in Kubernetes to happen
type Healthy interface {
	// ForAPI waits for the API Server's /healthz endpoint to become "ok"
	ForAPI() error
	// ForHealthyKubelet blocks until the kubelet /healthz endpoint returns 'ok'
	ForHealthyKubelet(initialTimeout time.Duration, host string) error
	// SetTimeout adjusts the timeout to the specified duration
	SetTimeout(timeout time.Duration)
	// ForHealthyPod pod status
	ForHealthyPod(pod *v1.Pod) string
}

// KubeHealthy is an implementation of Healthy that is backed by a Kubernetes client
type kubeHealthy struct {
	client  clientset.Interface
	timeout time.Duration
}

// NewKubeHealthy returns a new Healthy object that talks to the given Kubernetes cluster
func NewKubeHealthy(client clientset.Interface, timeout time.Duration) Healthy {
	return &kubeHealthy{
		client:  client,
		timeout: timeout,
	}
}

// ForAPI waits for the API Server's /healthz endpoint to report "ok"
func (w *kubeHealthy) ForAPI() error {
	start := time.Now()
	return wait.PollImmediate(APICallRetryInterval, w.timeout, func() (bool, error) {
		healthStatus := 0
		w.client.Discovery().RESTClient().Get().AbsPath("/healthz").Do(context.TODO()).StatusCode(&healthStatus)
		if healthStatus != http.StatusOK {
			return false, nil
		}

		logger.Debug("[apiclient] All control plane components are healthy after %f seconds\n", time.Since(start).Seconds())
		return true, nil
	})
}

// ForHealthyKubelet blocks until the kubelet /healthz endpoint returns 'ok',port is 10248
func (w *kubeHealthy) ForHealthyKubelet(initialTimeout time.Duration, host string) error {
	time.Sleep(initialTimeout)
	logger.Debug("[kubelet-check] Initial timeout of %v passed.\n", initialTimeout)
	return tryRunCommand(func() error {
		trans := netutil.SetOldTransportDefaults(&http.Transport{})
		client := &http.Client{Transport: trans}

		healthzEndpoint, _ := url.JoinPath(fmt.Sprintf("http://%s:%d", host, KubeletHealthzPort), "healthz")
		resp, err := client.Get(healthzEndpoint)
		if err != nil {
			logger.Warn("[kubelet-check] It seems like the kubelet isn't running or healthy.")
			logger.Warn("[kubelet-check] The HTTP call equal to 'curl -sSL %s' failed with error: %v.\n", healthzEndpoint, err)
			return err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			logger.Warn("[kubelet-check] It seems like the kubelet isn't running or healthy.")
			logger.Warn("[kubelet-check] The HTTP call equal to 'curl -sSL %s' returned HTTP code %d\n", healthzEndpoint, resp.StatusCode)
			return errors.New("the kubelet healthz endpoint is unhealthy")
		}
		b, err := io.ReadAll(resp.Body)
		if err != nil {
			logger.Warn("[kubelet-check] It seems like the kubelet isn't running or healthy.")
			logger.Warn("[kubelet-check] The HTTP call equal to 'curl -sSL %s' failed with error: %v.\n", healthzEndpoint, err)
			return err
		}
		if string(b) != "ok" {
			logger.Warn("[kubelet-check] It seems like the kubelet isn't running or healthy.")
			logger.Warn("[kubelet-check] The HTTP call equal to 'curl -sSL %s' returned HTTP code %d\n", healthzEndpoint, resp.StatusCode)
			return errors.New("the kubelet healthz endpoint is unhealthy: resp is " + string(b))
		}

		return nil
	}, 5) // a failureThreshold of five means waiting for a total of 155 seconds
}

// SetTimeout adjusts the timeout to the specified duration
func (w *kubeHealthy) SetTimeout(timeout time.Duration) {
	w.timeout = timeout
}

func (w *kubeHealthy) ForHealthyPod(pod *v1.Pod) string {
	return printPod(pod)
}

func printPod(pod *v1.Pod) string {
	restarts := 0
	readyContainers := 0
	lastRestartDate := metav1.NewTime(time.Time{})

	reason := string(pod.Status.Phase)
	if pod.Status.Reason != "" {
		reason = pod.Status.Reason
	}

	initializing := false
	for i := range pod.Status.InitContainerStatuses {
		container := pod.Status.InitContainerStatuses[i]
		restarts += int(container.RestartCount)
		if container.LastTerminationState.Terminated != nil {
			terminatedDate := container.LastTerminationState.Terminated.FinishedAt
			if lastRestartDate.Before(&terminatedDate) {
				lastRestartDate = terminatedDate
			}
		}
		switch {
		case container.State.Terminated != nil && container.State.Terminated.ExitCode == 0:
			continue
		case container.State.Terminated != nil:
			// initialization is failed
			if len(container.State.Terminated.Reason) == 0 {
				if container.State.Terminated.Signal != 0 {
					reason = fmt.Sprintf("Init:Signal:%d", container.State.Terminated.Signal)
				} else {
					reason = fmt.Sprintf("Init:ExitCode:%d", container.State.Terminated.ExitCode)
				}
			} else {
				reason = "Init:" + container.State.Terminated.Reason
			}
			initializing = true
		case container.State.Waiting != nil && len(container.State.Waiting.Reason) > 0 && container.State.Waiting.Reason != "PodInitializing":
			reason = "Init:" + container.State.Waiting.Reason
			initializing = true
		default:
			reason = fmt.Sprintf("Init:%d/%d", i, len(pod.Spec.InitContainers))
			initializing = true
		}
		break
	}
	if !initializing {
		restarts = 0
		hasRunning := false
		for i := len(pod.Status.ContainerStatuses) - 1; i >= 0; i-- {
			container := pod.Status.ContainerStatuses[i]

			restarts += int(container.RestartCount)
			if container.LastTerminationState.Terminated != nil {
				terminatedDate := container.LastTerminationState.Terminated.FinishedAt
				if lastRestartDate.Before(&terminatedDate) {
					lastRestartDate = terminatedDate
				}
			}
			if container.State.Waiting != nil && container.State.Waiting.Reason != "" {
				reason = container.State.Waiting.Reason
			} else if container.State.Terminated != nil && container.State.Terminated.Reason != "" {
				reason = container.State.Terminated.Reason
			} else if container.State.Terminated != nil && container.State.Terminated.Reason == "" {
				if container.State.Terminated.Signal != 0 {
					reason = fmt.Sprintf("Signal:%d", container.State.Terminated.Signal)
				} else {
					reason = fmt.Sprintf("ExitCode:%d", container.State.Terminated.ExitCode)
				}
			} else if container.Ready && container.State.Running != nil {
				hasRunning = true
				readyContainers++
			}
		}

		// change pod status back to "Running" if there is at least one container still reporting as "Running" status
		if reason == "Completed" && hasRunning {
			if func() bool {
				for _, condition := range pod.Status.Conditions {
					if condition.Type == v1.PodReady && condition.Status == v1.ConditionTrue {
						return true
					}
				}
				return false
			}() {
				reason = "Running"
			} else {
				reason = "NotReady"
			}
		}
	}

	if pod.DeletionTimestamp != nil && pod.Status.Reason == "NodeLost" {
		reason = "Unknown"
	} else if pod.DeletionTimestamp != nil {
		reason = "Terminating"
	}

	return reason
}

// TryRunCommand runs a function a maximum of failureThreshold times, and retries on error. If failureThreshold is hit; the last error is returned
func tryRunCommand(f func() error, failureThreshold int) error {
	backoff := wait.Backoff{
		Duration: 5 * time.Second,
		Factor:   2, // double the timeout for every failure
		Steps:    failureThreshold,
	}
	return wait.ExponentialBackoff(backoff, func() (bool, error) {
		err := f()
		if err != nil {
			// Retry until the timeout
			return false, nil //nolint:nilerr
		}
		// The last f() call was a success, return cleanly
		return true, nil
	})
}
