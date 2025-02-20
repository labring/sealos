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
	"sort"
	"strings"

	"crypto/ed25519"
	"crypto/rand"
	"encoding/pem"

	"golang.org/x/crypto/ssh"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/utils/ptr"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	utilsresource "github.com/labring/sealos/controllers/devbox/internal/controller/utils/resource"
	"github.com/labring/sealos/controllers/devbox/label"
)

const (
	DevBoxPartOf = "devbox"
)

func GeneratePodLabels(devbox *devboxv1alpha1.Devbox) map[string]string {
	labels := make(map[string]string)

	if devbox.Spec.Config.Labels != nil {
		for k, v := range devbox.Spec.Config.Labels {
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

func GeneratePodAnnotations(devbox *devboxv1alpha1.Devbox) map[string]string {
	annotations := make(map[string]string)
	if devbox.Spec.Config.Annotations != nil {
		for k, v := range devbox.Spec.Config.Annotations {
			annotations[k] = v
		}
	}
	return annotations
}

func GenerateDevboxPhase(devbox *devboxv1alpha1.Devbox, podList corev1.PodList) devboxv1alpha1.DevboxPhase {
	if len(podList.Items) > 1 {
		return devboxv1alpha1.DevboxPhaseError
	}
	switch devbox.Spec.State {
	case devboxv1alpha1.DevboxStateRunning:
		if len(podList.Items) == 0 {
			return devboxv1alpha1.DevboxPhasePending
		}
		switch podList.Items[0].Status.Phase {
		case corev1.PodFailed, corev1.PodSucceeded:
			return devboxv1alpha1.DevboxPhaseStopped
		case corev1.PodPending:
			return devboxv1alpha1.DevboxPhasePending
		case corev1.PodRunning:
			if podList.Items[0].Status.ContainerStatuses[0].Ready && podList.Items[0].Status.ContainerStatuses[0].ContainerID != "" {
				return devboxv1alpha1.DevboxPhaseRunning
			}
			return devboxv1alpha1.DevboxPhasePending
		}
	case devboxv1alpha1.DevboxStateStopped:
		if len(podList.Items) == 0 {
			return devboxv1alpha1.DevboxPhaseStopped
		}
		return devboxv1alpha1.DevboxPhaseStopping
	}
	return devboxv1alpha1.DevboxPhaseUnknown
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
			devbox.Status.CommitHistory[i].PredicatedStatus = PredicateCommitStatus(pod)
			break
		}
	}
}

// UpdateDevboxStatus updates the devbox status, including phase, pod phase, last terminated state and commit history, maybe we need update more fields in the future
// TODO: move this function to devbox types.go
func UpdateDevboxStatus(current, latest *devboxv1alpha1.Devbox) {
	latest.Status.Phase = current.Status.Phase
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
			PredicatedStatus: PredicateCommitStatus(pod),
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

func podContainerID(pod *corev1.Pod) string {
	if len(pod.Status.ContainerStatuses) > 0 {
		return pod.Status.ContainerStatuses[0].ContainerID
	}
	return ""
}
func PredicateCommitStatus(pod *corev1.Pod) devboxv1alpha1.CommitStatus {
	if podContainerID(pod) == "" {
		return devboxv1alpha1.CommitStatusPending
	}
	return devboxv1alpha1.CommitStatusSuccess
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

func GetLastPredicatedSuccessCommitHistory(devbox *devboxv1alpha1.Devbox) *devboxv1alpha1.CommitHistory {
	if len(devbox.Status.CommitHistory) == 0 {
		return nil
	}
	// Sort commit history by time in descending order
	sort.Slice(devbox.Status.CommitHistory, func(i, j int) bool {
		return devbox.Status.CommitHistory[i].Time.After(devbox.Status.CommitHistory[j].Time.Time)
	})
	for _, commit := range devbox.Status.CommitHistory {
		if commit.PredicatedStatus == devboxv1alpha1.CommitStatusSuccess {
			return commit
		}
	}
	return nil
}

func GetLastSuccessCommitImageName(devbox *devboxv1alpha1.Devbox) string {
	if len(devbox.Status.CommitHistory) == 0 {
		return devbox.Spec.Image
	}
	commit := GetLastSuccessCommitHistory(devbox)
	if commit == nil {
		return devbox.Spec.Image
	}
	return commit.Image
}

func GenerateSSHVolumeMounts() []corev1.VolumeMount {
	return []corev1.VolumeMount{
		{
			Name:      "devbox-ssh-keys",
			MountPath: "/usr/start/.ssh/authorized_keys",
			SubPath:   "authorized_keys",
			ReadOnly:  true,
		},
		{
			Name:      "devbox-ssh-keys",
			MountPath: "/usr/start/.ssh/id.pub",
			SubPath:   "id.pub",
			ReadOnly:  true,
		},
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
						Key:  "SEALOS_DEVBOX_PUBLIC_KEY",
						Path: "id.pub",
					},
					{
						Key:  "SEALOS_DEVBOX_AUTHORIZED_KEYS",
						Path: "authorized_keys",
					},
				},
				DefaultMode: ptr.To(int32(420)),
			},
		},
	}
}

// GenerateResourceRequirements generates the resource requirements for the Devbox pod
func GenerateResourceRequirements(devbox *devboxv1alpha1.Devbox, requestRate utilsresource.RequestRate, ephemeralStorage utilsresource.EphemeralStorage) corev1.ResourceRequirements {
	return corev1.ResourceRequirements{
		Limits:   calculateResourceLimit(devbox.Spec.Resource, ephemeralStorage),
		Requests: calculateResourceRequest(devbox.Spec.Resource, requestRate, ephemeralStorage),
	}
}

func calculateResourceLimit(original corev1.ResourceList, ephemeralStorage utilsresource.EphemeralStorage) corev1.ResourceList {
	limit := original.DeepCopy()
	// If ephemeral storage limit is not set, set it to default limit
	if l, ok := limit[corev1.ResourceEphemeralStorage]; !ok {
		limit[corev1.ResourceEphemeralStorage] = ephemeralStorage.DefaultLimit
	} else {
		// Check if the resource limit for ephemeral storage is set and compare it, if it is exceeded the maximum limit, set it to maximum limit
		if l.AsApproximateFloat64() > ephemeralStorage.MaximumLimit.AsApproximateFloat64() {
			limit[corev1.ResourceEphemeralStorage] = ephemeralStorage.MaximumLimit
		}
	}
	return limit
}

func calculateResourceRequest(original corev1.ResourceList, requestRate utilsresource.RequestRate, ephemeralStorage utilsresource.EphemeralStorage) corev1.ResourceList {
	// deep copy limit to request, only cpu and memory are calculated
	request := original.DeepCopy()
	// Calculate CPU request
	if cpu, ok := original[corev1.ResourceCPU]; ok {
		cpuValue := cpu.AsApproximateFloat64()
		cpuRequest := cpuValue / requestRate.CPU
		request[corev1.ResourceCPU] = *resource.NewMilliQuantity(int64(cpuRequest*1000), resource.DecimalSI)
	}
	// Calculate memory request
	if memory, ok := original[corev1.ResourceMemory]; ok {
		memoryValue := memory.AsApproximateFloat64()
		memoryRequest := memoryValue / requestRate.Memory
		request[corev1.ResourceMemory] = *resource.NewQuantity(int64(memoryRequest), resource.BinarySI)
	}
	// Set ephemeral storage request to default request
	request[corev1.ResourceEphemeralStorage] = ephemeralStorage.DefaultRequest
	return request
}

// GetWorkingDir get the working directory for the Devbox pod
func GetWorkingDir(devbox *devboxv1alpha1.Devbox) string {
	return devbox.Spec.Config.WorkingDir
}

// GetCommand get the command for the Devbox pod
func GetCommand(devbox *devboxv1alpha1.Devbox) []string {
	return devbox.Spec.Config.Command
}

// GetArgs get the arguments for the Devbox pod
func GetArgs(devbox *devboxv1alpha1.Devbox) []string {
	return devbox.Spec.Config.Args
}

func IsExceededQuotaError(err error) bool {
	return strings.Contains(err.Error(), "exceeded quota")
}
