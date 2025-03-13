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
	MinRequestCPU  = 100
	MinRequestMem  = 100
	ExemptionLabel = "webhook.sealos.io/exemption"
)

//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:webhook:path=/mutate-core-v1-pod,mutating=true,failurePolicy=ignore,sideEffects=None,groups=core,resources=pods,verbs=create;update,versions=v1,name=mpod.sealos.io,admissionReviewVersions=v1

//+kubebuilder:object:generate=false

type PodMutator struct {
	client.Client
}

func (m *PodMutator) Mutate(pod *corev1.Pod) error {
	// for each container, if it has resource request, set it to max(100m, limit/10)
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
		if !cpuLimit.IsZero() {
			cpuValue := float64(cpuLimit.MilliValue()) / 10
			container.Resources.Requests[corev1.ResourceCPU] = *resource.NewMilliQuantity(int64(math.Max(MinRequestCPU, cpuValue)), resource.DecimalSI)
		}
		if !memLimit.IsZero() {
			memValue := float64(memLimit.Value()) / 10
			container.Resources.Requests[corev1.ResourceMemory] = *resource.NewQuantity(int64(math.Max(MinRequestMem, memValue)), resource.DecimalSI)
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
