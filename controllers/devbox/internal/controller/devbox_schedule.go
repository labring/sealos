package controller

import (
	"context"
	"fmt"
	"math"
	"strconv"

	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	"github.com/labring/sealos/controllers/devbox/internal/controller/helper"
	"github.com/labring/sealos/controllers/devbox/internal/stat"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

func (r *DevboxReconciler) getAcceptanceConsideration(
	ctx context.Context,
) (helper.AcceptanceConsideration, error) {
	logger := log.FromContext(ctx)
	node := &corev1.Node{}
	if err := r.Get(context.Background(), client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return helper.AcceptanceConsideration{}, err
	}
	ann := node.Annotations
	ac := helper.AcceptanceConsideration{}
	if v, err := strconv.ParseFloat(ann[devboxv1alpha2.AnnotationContainerFSAvailableThreshold], 64); err != nil {
		logger.Info(
			"failed to parse containerfs available threshold. use default value instead",
			"value",
			ann[devboxv1alpha2.AnnotationContainerFSAvailableThreshold],
		)
		ac.ContainerFSAvailableThreshold = helper.DefaultContainerFSAvailableThreshold
	} else {
		ac.ContainerFSAvailableThreshold = v
	}
	if v, err := strconv.ParseFloat(ann[devboxv1alpha2.AnnotationCPURequestRatio], 64); err != nil {
		logger.Info(
			"failed to parse CPU request ratio. use default value instead",
			"value",
			ann[devboxv1alpha2.AnnotationCPURequestRatio],
		)
		ac.CPURequestRatio = helper.DefaultCPURequestRatio
	} else {
		ac.CPURequestRatio = v
	}
	if v, err := strconv.ParseFloat(ann[devboxv1alpha2.AnnotationCPULimitRatio], 64); err != nil {
		logger.Info(
			"failed to parse CPU limit ratio. use default value instead",
			"value",
			ann[devboxv1alpha2.AnnotationCPULimitRatio],
		)
		ac.CPULimitRatio = helper.DefaultCPULimitRatio
	} else {
		ac.CPULimitRatio = v
	}
	if v, err := strconv.ParseFloat(ann[devboxv1alpha2.AnnotationMemoryRequestRatio], 64); err != nil {
		logger.Info(
			"failed to parse memory request ratio. use default value instead",
			"value",
			ann[devboxv1alpha2.AnnotationMemoryRequestRatio],
		)
		ac.MemoryRequestRatio = helper.DefaultMemoryRequestRatio
	} else {
		ac.MemoryRequestRatio = v
	}
	if v, err := strconv.ParseFloat(ann[devboxv1alpha2.AnnotationMemoryLimitRatio], 64); err != nil {
		logger.Info(
			"failed to parse memory limit ratio. use default value instead",
			"value",
			ann[devboxv1alpha2.AnnotationMemoryLimitRatio],
		)
		ac.MemoryLimitRatio = helper.DefaultMemoryLimitRatio
	} else {
		ac.MemoryLimitRatio = v
	}
	return ac, nil
}

func (r *DevboxReconciler) getAcceptanceScore(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
) int {
	logger := log.FromContext(ctx)
	var (
		ac                  helper.AcceptanceConsideration
		containerFsStats    stat.FsStats
		err                 error
		availableBytes      uint64
		availablePercentage float64
		capacityBytes       uint64
		cpuRequestRatio     float64
		cpuLimitRatio       float64
		memoryRequestRatio  float64
		memoryLimitRatio    float64
		storageLimitBytes   int64

		score int
	)
	ac, err = r.getAcceptanceConsideration(ctx)
	if err != nil {
		logger.Error(err, "failed to get acceptance consideration")
		goto unsuitable // If we can't get the acceptance consideration, we assume the node is not suitable
	}
	containerFsStats, err = r.ContainerFsStats(ctx)
	switch {
	case err != nil:
		logger.Error(err, "failed to get container filesystem stats")
		goto unsuitable // If we can't get the container filesystem stats, we assume the node is not suitable
	case containerFsStats.AvailableBytes == nil:
		logger.Info("available bytes is nil, assume the node is not suitable")
		goto unsuitable // If we can't get the available bytes, we assume the node is not suitable
	case containerFsStats.CapacityBytes == nil:
		logger.Info("capacity bytes is nil, assume the node is not suitable")
		goto unsuitable // If we can't get the capacity bytes, we assume the node is not suitable
	}
	availableBytes = *containerFsStats.AvailableBytes
	capacityBytes = *containerFsStats.CapacityBytes
	if storageLimitBytes, err = helper.GetStorageLimitInBytes(devbox); err != nil {
		logger.Error(err, "failed to get storage limit")
		goto unsuitable // If we can't get the storage limit, we assume the node is not suitable
	} else if storageLimitBytes > 0 && availableBytes < uint64(storageLimitBytes) {
		logger.Info("available bytes less than storage limit", "availableBytes", availableBytes, "storageLimitBytes", storageLimitBytes)
		goto unsuitable // If available bytes are less than the storage limit, we assume the node is not suitable
	}
	availablePercentage = float64(availableBytes) / float64(capacityBytes) * 100
	if availablePercentage > ac.ContainerFSAvailableThreshold {
		logger.Info("container filesystem available percentage is greater than threshold",
			"availablePercentage", availablePercentage,
			"threshold", ac.ContainerFSAvailableThreshold)
		score += getScoreUnit(1)
	}
	cpuRequestRatio, err = r.getTotalCPURequestRatio(ctx)
	if err != nil {
		logger.Error(err, "failed to get total CPU request")
		goto unsuitable // If we can't get the CPU request, we assume the node is not suitable
	} else if cpuRequestRatio < ac.CPURequestRatio {
		logger.Info("cpu request ratio is less than cpu overcommitment request ratio", "RequestRatio", cpuRequestRatio, "ratio", ac.CPURequestRatio)
		score += getScoreUnit(0)
	}
	cpuLimitRatio, err = r.getTotalCPULimitRatio(ctx)
	if err != nil {
		logger.Error(err, "failed to get total CPU limit")
		goto unsuitable // If we can't get the CPU limit, we assume the node is not suitable
	} else if cpuLimitRatio < ac.CPULimitRatio {
		logger.Info("cpu limit ratio is less than cpu overcommitment limit ratio", "LimitRatio", cpuLimitRatio, "ratio", ac.CPULimitRatio)
		score += getScoreUnit(0)
	}
	memoryRequestRatio, err = r.getTotalMemoryRequestRatio(ctx)
	if err != nil {
		logger.Error(err, "failed to get total memory request")
		goto unsuitable // If we can't get the memory request, we assume the node is not suitable
	} else if memoryRequestRatio < ac.MemoryRequestRatio {
		logger.Info("memory request ratio is less than memory overcommitment request ratio", "RequestRatio", memoryRequestRatio, "ratio", ac.MemoryRequestRatio)
		score += getScoreUnit(0)
	}
	memoryLimitRatio, err = r.getTotalMemoryLimitRatio(ctx)
	if err != nil {
		logger.Error(err, "failed to get total memory limit")
		goto unsuitable // If we can't get the memory limit, we assume the node is not suitable
	} else if memoryLimitRatio < ac.MemoryLimitRatio {
		logger.Info("memory limit ratio is less than memory overcommitment limit ratio", "LimitRatio", memoryLimitRatio, "ratio", ac.MemoryLimitRatio)
		score += getScoreUnit(0)
	}
	return score
unsuitable:
	return math.MinInt
}

// This function may lead to overflow if p is too large, but since p is always in the range of 0-6, it should be safe.
// Use with caution.
func getScoreUnit(p uint) int {
	return 16 << (p * 4)
}

// getTotalCPURequestRatio returns the total CPU requests (in millicores) ratio for all pods in the namespace.
func (r *DevboxReconciler) getTotalCPURequestRatio(ctx context.Context) (float64, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.MatchingFields{devboxv1alpha2.PodNodeNameIndex: r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalCPURequest int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if cpuReq, ok := container.Resources.Requests[corev1.ResourceCPU]; ok {
				// TODO: check if this could lead to overflow
				totalCPURequest += cpuReq.Value()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableCPU := node.Status.Allocatable[corev1.ResourceCPU]
	allocatableMilli := allocatableCPU.Value()
	if allocatableMilli == 0 {
		return 0, fmt.Errorf("node %s allocatable CPU is zero", r.NodeName)
	}
	ratio := float64(totalCPURequest) / float64(allocatableMilli)
	return ratio, nil
}

// getTotalCPULimitRatio returns the total CPU limits (in millicores) ratio for all pods in the namespace.
func (r *DevboxReconciler) getTotalCPULimitRatio(ctx context.Context) (float64, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.MatchingFields{devboxv1alpha2.PodNodeNameIndex: r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalCPULimit int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if cpuLimit, ok := container.Resources.Limits[corev1.ResourceCPU]; ok {
				// TODO: check if this could lead to overflow
				totalCPULimit += cpuLimit.Value()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableCPU := node.Status.Allocatable[corev1.ResourceCPU]
	allocatableMilli := allocatableCPU.Value()
	if allocatableMilli == 0 {
		return 0, fmt.Errorf("node %s allocatable CPU is zero", r.NodeName)
	}
	ratio := float64(totalCPULimit) / float64(allocatableMilli)
	return ratio, nil
}

// getTotalMemoryRequestRatio returns the total memory requests ratio for all pods in the namespace.
func (r *DevboxReconciler) getTotalMemoryRequestRatio(ctx context.Context) (float64, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.MatchingFields{devboxv1alpha2.PodNodeNameIndex: r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalMemoryRequest int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if memReq, ok := container.Resources.Requests[corev1.ResourceMemory]; ok {
				// TODO: check if this could lead to overflow
				totalMemoryRequest += memReq.Value()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableMemory := node.Status.Allocatable[corev1.ResourceMemory]
	allocatableBytes := allocatableMemory.Value()
	if allocatableBytes == 0 {
		return 0, fmt.Errorf("node %s allocatable memory is zero", r.NodeName)
	}
	ratio := float64(totalMemoryRequest) / float64(allocatableBytes)
	return ratio, nil
}

// getTotalMemoryLimitRatio returns the total memory limits ratio for all pods in the namespace.
func (r *DevboxReconciler) getTotalMemoryLimitRatio(ctx context.Context) (float64, error) {
	podList := &corev1.PodList{}
	listOpts := []client.ListOption{
		client.MatchingFields{devboxv1alpha2.PodNodeNameIndex: r.NodeName},
	}
	if err := r.List(ctx, podList, listOpts...); err != nil {
		return 0, err
	}
	var totalMemoryLimit int64
	for _, pod := range podList.Items {
		for _, container := range pod.Spec.Containers {
			if memLimit, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				// TODO: check if this could lead to overflow
				totalMemoryLimit += memLimit.Value()
			}
		}
	}
	node := &corev1.Node{}
	if err := r.Get(ctx, client.ObjectKey{Name: r.NodeName}, node); err != nil {
		return 0, err
	}
	allocatableMemory := node.Status.Allocatable[corev1.ResourceMemory]
	allocatableBytes := allocatableMemory.Value()
	if allocatableBytes == 0 {
		return 0, fmt.Errorf("node %s allocatable memory is zero", r.NodeName)
	}
	ratio := float64(totalMemoryLimit) / float64(allocatableBytes)
	return ratio, nil
}
