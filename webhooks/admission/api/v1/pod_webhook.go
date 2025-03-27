package v1

import (
	"context"
	"errors"
	"math"

	corev1 "k8s.io/api/core/v1"
	resource "k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"

	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

// log is for logging in this package.
var plog = logf.Log.WithName("pod-mutate-webhook")

const (
	ExemptionLabel = "webhook.sealos.io/exemption"
)

//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:webhook:path=/mutate-core-v1-pod,mutating=true,failurePolicy=ignore,sideEffects=None,groups=core,resources=pods,verbs=create;update,versions=v1,name=mpod.sealos.io,admissionReviewVersions=v1

//+kubebuilder:object:generate=false

type PodMutator struct {
	client.Client
	MinRequestCPU resource.Quantity
	MinRequestMem resource.Quantity
	RequestRatio  float64
}

func (m *PodMutator) Mutate(pod *corev1.Pod) error {
	// for each container, if it has resource request, set it to max(minRequest, limit * DefaultRequestRatio)
	for i := range pod.Spec.Containers {
		container := &pod.Spec.Containers[i]
		if container.Resources.Requests == nil {
			container.Resources.Requests = make(corev1.ResourceList)
		}
		if container.Resources.Limits == nil {
			container.Resources.Limits = make(corev1.ResourceList)
		}
		cpuLimit := container.Resources.Limits[corev1.ResourceCPU]
		memLimit := container.Resources.Limits[corev1.ResourceMemory]

		// Handle CPU requests
		if !cpuLimit.IsZero() {
			// CPU is in millicores (1 core = 1000m)
			cpuValue := float64(cpuLimit.MilliValue())
			minCPU := float64(m.MinRequestCPU.MilliValue())
			requestedCPU := cpuValue / m.RequestRatio
			container.Resources.Requests[corev1.ResourceCPU] = *resource.NewMilliQuantity(
				int64(math.Max(minCPU, requestedCPU)),
				resource.DecimalSI,
			)
		}

		// Handle Memory requests
		if !memLimit.IsZero() {
			// Memory is in bytes (1Mi = 1024*1024 bytes)
			memValue := float64(memLimit.Value())
			minMem := float64(m.MinRequestMem.Value())
			requestedMem := memValue / m.RequestRatio
			container.Resources.Requests[corev1.ResourceMemory] = *resource.NewQuantity(
				int64(math.Max(minMem, requestedMem)),
				resource.BinarySI,
			)
		}
	}
	return nil
}

func (m *PodMutator) Default(_ context.Context, obj runtime.Object) error {
	p, ok := obj.(*corev1.Pod)
	if !ok {
		return errors.New("obj convert to Pod error")
	}
	plog.Info("mutating create/update", "name", p.Name)
	if _, ok := p.Labels[ExemptionLabel]; ok {
		return nil
	}
	return m.Mutate(p)
}
