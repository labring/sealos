package v1

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/google/go-containerregistry/pkg/name"

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
	// ExemptionOwnerRefKind is the kind of the owner reference that exempts the pod from mutation
	ExemptionOwnerRefKind = "Devbox"
)

//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:webhook:path=/mutate--v1-pod,mutating=true,failurePolicy=ignore,sideEffects=None,groups=core,resources=pods,verbs=create;update,versions=v1,name=mpod.sealos.io,admissionReviewVersions=v1

//+kubebuilder:object:generate=false

type PodMutator struct {
	client.Client
	MinRequestCPU resource.Quantity
	MinRequestMem resource.Quantity
	RequestRatio  float64
}

func (m *PodMutator) Default(_ context.Context, obj runtime.Object) error {
	p, ok := obj.(*corev1.Pod)
	if !ok {
		return errors.New("obj convert to Pod error")
	}
	plog.Info("mutating create/update", "name", p.Name)
	if _, ok := p.Labels[ExemptionLabel]; ok {
		plog.Info("skip mutating exempted pod", "namespace", p.Namespace, "name", p.Name)
		return nil
	}
	for _, owner := range p.OwnerReferences {
		if owner.Kind == ExemptionOwnerRefKind {
			plog.Info("skip mutating devbox pod", "namespace", p.Namespace, "name", p.Name)
			return nil
		}
	}
	return m.mutate(p)
}

func (m *PodMutator) mutate(pod *corev1.Pod) error {
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

type PodValidator struct {
	client.Client
	TargetRegistry string
}

//+kubebuilder:webhook:path=/validate--v1-pod,mutating=false,failurePolicy=ignore,sideEffects=None,groups=core,resources=pods,verbs=create;update,versions=v1,name=vpod.sealos.io,admissionReviewVersions=v1

func (v *PodValidator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	p, ok := obj.(*corev1.Pod)
	if !ok {
		return errors.New("obj convert to Pod error")
	}
	plog.Info("validating create", "name", p.Name)
	return v.validate(p)
}

func (v *PodValidator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) error {
	newPod, ok := newObj.(*corev1.Pod)
	if !ok {
		return errors.New("obj convert to Pod error")
	}
	plog.Info("validating update", "name", newPod.Name)
	return v.validate(newPod)
}

func (v *PodValidator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	return nil
}

func (v *PodValidator) validate(pod *corev1.Pod) error {
	// Check if the pod is exempt from validation
	if _, ok := pod.Labels[ExemptionLabel]; ok {
		return nil
	}
	// Check if the pod is being deleted
	if pod.DeletionTimestamp != nil {
		return nil
	}
	for _, container := range pod.Spec.Containers {
		if err := v.validateContainer(pod, &container); err != nil {
			return err
		}
	}
	return nil
}

func (v *PodValidator) validateContainer(pod *corev1.Pod, container *corev1.Container) error {
	plog.Info("validating", "name", pod.Name, "namespace", pod.Namespace, "container", container.Name, "image", container.Image)
	image := container.Image
	imageRegistry, err := getImageRegistry(image)
	if err != nil {
		plog.Error(err, "could not get image registry")
		return err
	}
	// if image registry is not target registry, allow it
	if imageRegistry != v.TargetRegistry {
		return nil
	}
	imageRepo, err := getImageRepo(image)
	if err != nil {
		plog.Error(err, "could not get image repo")
		return err
	}
	// if image repo is not ns- prefixed, allow it
	if !strings.HasPrefix(imageRepo, "ns-") {
		return nil
	}
	// if image repo is not equal to spec namespace, deny it
	if imageRepo != pod.Namespace {
		return errors.New("image repo is not equal to spec namespace")
	}

	return nil
}

// getImageRegistry returns the registry name of the image
func getImageRegistry(image string) (string, error) {
	ref, err := name.ParseReference(image)
	if err != nil {
		plog.Error(err, "could not parse image reference")
		return "", err
	}
	return ref.Context().RegistryStr(), nil
}

// getImageRepo returns the repository name of the image
func getImageRepo(image string) (string, error) {
	ref, err := name.ParseReference(image)
	if err != nil {
		plog.Error(err, "could not parse image reference")
		return "", err
	}
	repo := ref.Context().RepositoryStr()
	parts := strings.Split(repo, "/")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid repository name: %s", repo)
	}
	return parts[0], nil
}
