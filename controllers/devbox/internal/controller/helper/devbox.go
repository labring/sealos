// Copyright © 2024 sealos.
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

package helper

import (
	"fmt"
	"log/slog"
	"sort"

	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"

	"golang.org/x/crypto/ssh"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"github.com/labring/sealos/controllers/devbox/label"
)

const (
	rate         = 10
	DevBoxPartOf = "devbox"
)

func GeneratePodLabels(devbox *devboxv1alpha1.Devbox, runtime *devboxv1alpha1.Runtime) map[string]string {
	labels := make(map[string]string)

	if runtime.Spec.Config.Labels != nil {
		for k, v := range runtime.Spec.Config.Labels {
			labels[k] = v
		}
	}
	if devbox.Spec.ExtraLabels != nil {
		for k, v := range devbox.Spec.ExtraLabels {
			labels[k] = v
		}
	}
	recLabels := label.RecommendedLabels(&label.Recommended{
		Name:      devbox.Name,
		ManagedBy: label.DefaultManagedBy,
		PartOf:    DevBoxPartOf,
	})
	for k, v := range recLabels {
		labels[k] = v
	}
	return labels
}

func GeneratePodAnnotations(devbox *devboxv1alpha1.Devbox, runtime *devboxv1alpha1.Runtime) map[string]string {
	annotations := make(map[string]string)
	if runtime.Spec.Config.Annotations != nil {
		for k, v := range runtime.Spec.Config.Annotations {
			annotations[k] = v
		}
	}
	if devbox.Spec.ExtraAnnotations != nil {
		for k, v := range devbox.Spec.ExtraAnnotations {
			annotations[k] = v
		}
	}
	return annotations
}

func MergeCommitHistory(devbox *devboxv1alpha1.Devbox, latestDevbox *devboxv1alpha1.Devbox) []*devboxv1alpha1.CommitHistory {
	res := make([]*devboxv1alpha1.CommitHistory, 0)
	historyMap := make(map[string]*devboxv1alpha1.CommitHistory)
	for _, c := range latestDevbox.Status.CommitHistory {
		historyMap[c.Pod] = c
	}
	// up coming commit history will be added to the latest devbox
	for _, c := range devbox.Status.CommitHistory {
		historyMap[c.Pod] = c
	}
	for _, c := range historyMap {
		res = append(res, c)
	}
	// sort commit history by time in descending order
	sort.Slice(res, func(i, j int) bool {
		return res[i].Time.After(res[j].Time.Time)
	})
	return res
}

func GenerateSSHKeyPair() ([]byte, []byte, error) {
	pubKey, privKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	pemKey, err := ssh.MarshalPrivateKey(privKey, "")
	if err != nil {
		return nil, nil, err
	}
	privateKey := pem.EncodeToMemory(pemKey)
	publicKey, err := ssh.NewPublicKey(pubKey)
	if err != nil {
		return nil, nil, err
	}
	sshPublicKey := ssh.MarshalAuthorizedKey(publicKey)
	return sshPublicKey, privateKey, nil
}

func UpdatePredicatedCommitStatus(devbox *devboxv1alpha1.Devbox, pod *corev1.Pod) {
	for i, c := range devbox.Status.CommitHistory {
		if c.Pod == pod.Name {
			devbox.Status.CommitHistory[i].PredicatedStatus = PodPhaseToCommitStatus(pod.Status.Phase)
			break
		}
	}
}

// UpdateDevboxStatus updates the devbox status, including phase, pod phase, last terminated state and commit history, maybe we need update more fields in the future
// TODO: move this function to devbox types.go
func UpdateDevboxStatus(current, latest *devboxv1alpha1.Devbox) {
	latest.Status.Phase = current.Status.Phase
	latest.Status.DevboxPodPhase = current.Status.DevboxPodPhase
	latest.Status.State = current.Status.State
	latest.Status.LastTerminationState = current.Status.LastTerminationState
	latest.Status.CommitHistory = MergeCommitHistory(current, latest)
}

func UpdateCommitHistory(devbox *devboxv1alpha1.Devbox, pod *corev1.Pod, updateStatus bool) {
	// update commit history, if devbox commit history missed the pod, we need add it
	found := false
	for i, c := range devbox.Status.CommitHistory {
		if c.Pod == pod.Name {
			found = true
			if updateStatus {
				devbox.Status.CommitHistory[i].Status = devbox.Status.CommitHistory[i].PredicatedStatus
			}
			if len(pod.Status.ContainerStatuses) > 0 {
				devbox.Status.CommitHistory[i].Node = pod.Spec.NodeName
				devbox.Status.CommitHistory[i].ContainerID = pod.Status.ContainerStatuses[0].ContainerID
			}
			break
		}
	}
	if !found {
		newCommitHistory := &devboxv1alpha1.CommitHistory{
			Pod:              pod.Name,
			PredicatedStatus: PodPhaseToCommitStatus(pod.Status.Phase),
		}
		if len(pod.Status.ContainerStatuses) > 0 {
			newCommitHistory.ContainerID = pod.Status.ContainerStatuses[0].ContainerID
			newCommitHistory.Node = pod.Spec.NodeName
		}
		if updateStatus {
			newCommitHistory.Status = newCommitHistory.PredicatedStatus
		}
		devbox.Status.CommitHistory = append(devbox.Status.CommitHistory, newCommitHistory)
	}
}

func PodPhaseToCommitStatus(podPhase corev1.PodPhase) devboxv1alpha1.CommitStatus {
	switch podPhase {
	case corev1.PodPending:
		return devboxv1alpha1.CommitStatusPending
	case corev1.PodRunning, corev1.PodFailed, corev1.PodSucceeded:
		return devboxv1alpha1.CommitStatusSuccess
	}
	return devboxv1alpha1.CommitStatusUnknown
}

func PodMatchExpectations(expectPod *corev1.Pod, pod *corev1.Pod) bool {
	if len(pod.Spec.Containers) == 0 {
		slog.Info("Pod has no containers")
		return false
	}
	container := pod.Spec.Containers[0]
	expectContainer := expectPod.Spec.Containers[0]

	// Check CPU and memory limits
	if container.Resources.Limits.Cpu().Cmp(*expectContainer.Resources.Limits.Cpu()) != 0 {
		slog.Info("CPU limits are not equal")
		return false
	}
	if container.Resources.Limits.Memory().Cmp(*expectContainer.Resources.Limits.Memory()) != 0 {
		slog.Info("Memory limits are not equal")
		return false
	}

	// Check environment variables
	if len(container.Env) != len(expectContainer.Env) {
		return false
	}
	for _, env := range container.Env {
		found := false
		for _, expectEnv := range expectContainer.Env {
			if env.Name == "SEALOS_COMMIT_IMAGE_NAME" {
				found = true
				break
			}
			if env.Name == expectEnv.Name && env.Value == expectEnv.Value {
				found = true
				break
			}
		}
		if !found {
			slog.Info("Environment variables are not equal", "env not found", env.Name, "env value", env.Value)
			return false
		}
	}

	// Check ports
	if len(container.Ports) != len(expectContainer.Ports) {
		return false
	}
	for _, expectPort := range expectContainer.Ports {
		found := false
		for _, podPort := range container.Ports {
			if expectPort.ContainerPort == podPort.ContainerPort && expectPort.Protocol == podPort.Protocol {
				found = true
				break
			}
		}
		if !found {
			slog.Info("Ports are not equal")
			return false
		}
	}

	return true
}

func GenerateDevboxEnvVars(devbox *devboxv1alpha1.Devbox, nextCommitHistory *devboxv1alpha1.CommitHistory) []corev1.EnvVar {
	// if devbox.Spec.Squash is true, and devbox.Status.CommitHistory has success commit history, we need to set SEALOS_COMMIT_IMAGE_SQUASH to true
	doSquash := false
	if devbox.Spec.Squash && len(devbox.Status.CommitHistory) > 0 {
		for _, commit := range devbox.Status.CommitHistory {
			if commit.Status == devboxv1alpha1.CommitStatusSuccess {
				doSquash = true
				break
			}
		}
	}

	return []corev1.EnvVar{
		{
			Name:  "SEALOS_COMMIT_ON_STOP",
			Value: "true",
		},
		{
			Name:  "SEALOS_COMMIT_IMAGE_NAME",
			Value: nextCommitHistory.Image,
		},
		{
			Name:  "SEALOS_COMMIT_IMAGE_SQUASH",
			Value: fmt.Sprintf("%v", doSquash),
		},
		{
			Name:  "SEALOS_DEVBOX_NAME",
			Value: devbox.Namespace + "-" + devbox.Name,
		},
		{
			Name: "SEALOS_DEVBOX_PASSWORD",
			ValueFrom: &corev1.EnvVarSource{
				SecretKeyRef: &corev1.SecretKeySelector{
					Key: "SEALOS_DEVBOX_PASSWORD",
					LocalObjectReference: corev1.LocalObjectReference{
						Name: devbox.Name,
					},
				},
			},
		},
		{
			Name: "SEALOS_DEVBOX_POD_UID",
			ValueFrom: &corev1.EnvVarSource{
				FieldRef: &corev1.ObjectFieldSelector{
					FieldPath: "metadata.uid",
				},
			},
		},
	}
}

func GetLastSuccessCommitHistory(devbox *devboxv1alpha1.Devbox) *devboxv1alpha1.CommitHistory {
	if len(devbox.Status.CommitHistory) == 0 {
		return nil
	}
	// Sort commit history by time in descending order
	sort.Slice(devbox.Status.CommitHistory, func(i, j int) bool {
		return devbox.Status.CommitHistory[i].Time.After(devbox.Status.CommitHistory[j].Time.Time)
	})

	for _, commit := range devbox.Status.CommitHistory {
		if commit.Status == devboxv1alpha1.CommitStatusSuccess {
			return commit
		}
	}
	return nil
}

func GetLastSuccessCommitImageName(devbox *devboxv1alpha1.Devbox, runtime *devboxv1alpha1.Runtime) string {
	if len(devbox.Status.CommitHistory) == 0 {
		return runtime.Spec.Config.Image
	}
	commit := GetLastSuccessCommitHistory(devbox)
	if commit == nil {
		return runtime.Spec.Config.Image
	}
	return commit.Image
}

func GenerateSSHVolumeMounts() corev1.VolumeMount {
	return corev1.VolumeMount{
		Name:      "devbox-ssh-keys",
		MountPath: "/usr/start/.ssh",
		ReadOnly:  true,
	}
}

// GenerateSSHVolume generates a volume for SSH keys
func GenerateSSHVolume(devbox *devboxv1alpha1.Devbox) corev1.Volume {
	return corev1.Volume{
		Name: "devbox-ssh-keys",
		VolumeSource: corev1.VolumeSource{
			Secret: &corev1.SecretVolumeSource{
				SecretName: devbox.Name,
				Items: []corev1.KeyToPath{
					{
						Key:  "SEALOS_DEVBOX_PRIVATE_KEY",
						Path: "id",
					},
					{
						Key:  "SEALOS_DEVBOX_PUBLIC_KEY",
						Path: "id.pub",
					},
				},
			},
		},
	}
}

func GenerateResourceRequirements(devbox *devboxv1alpha1.Devbox, equatorialStorage string) corev1.ResourceRequirements {
	return corev1.ResourceRequirements{
		Requests: calculateResourceRequest(
			corev1.ResourceList{
				corev1.ResourceCPU:    devbox.Spec.Resource["cpu"],
				corev1.ResourceMemory: devbox.Spec.Resource["memory"],
			},
		),
		Limits: corev1.ResourceList{
			"cpu":               devbox.Spec.Resource["cpu"],
			"memory":            devbox.Spec.Resource["memory"],
			"ephemeral-storage": resource.MustParse(equatorialStorage),
		},
	}
}

func calculateResourceRequest(limit corev1.ResourceList) corev1.ResourceList {
	if limit == nil {
		return nil
	}
	request := make(corev1.ResourceList)
	// Calculate CPU request
	if cpu, ok := limit[corev1.ResourceCPU]; ok {
		cpuValue := cpu.AsApproximateFloat64()
		cpuRequest := cpuValue / rate
		request[corev1.ResourceCPU] = *resource.NewMilliQuantity(int64(cpuRequest*1000), resource.DecimalSI)
	}
	// Calculate memory request
	if memory, ok := limit[corev1.ResourceMemory]; ok {
		memoryValue := memory.AsApproximateFloat64()
		memoryRequest := memoryValue / rate
		request[corev1.ResourceMemory] = *resource.NewQuantity(int64(memoryRequest), resource.BinarySI)
	}
	return request
}

// GenerateWorkingDir generates the working directory for the Devbox pod
func GenerateWorkingDir(devbox *devboxv1alpha1.Devbox, runtime *devboxv1alpha1.Runtime) string {
	if devbox.Spec.WorkingDir != "" {
		return devbox.Spec.WorkingDir
	}
	return runtime.Spec.Config.WorkingDir
}

// GenerateCommand generates the command for the Devbox pod
func GenerateCommand(devbox *devboxv1alpha1.Devbox, runtime *devboxv1alpha1.Runtime) []string {
	if len(devbox.Spec.Command) != 0 {
		return devbox.Spec.Command
	}
	return runtime.Spec.Config.Command
}

// GenerateDevboxArgs generates the arguments for the Devbox pod
func GenerateDevboxArgs(devbox *devboxv1alpha1.Devbox, runtime *devboxv1alpha1.Runtime) []string {
	if len(devbox.Spec.Args) != 0 {
		return devbox.Spec.Args
	}
	return runtime.Spec.Config.Args
}
