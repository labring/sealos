package webhook

import (
	"context"
	"encoding/json"
	"strings"

	corev1 "k8s.io/api/core/v1"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const (
	devboxOwnerAPIVersion = "devbox.sealos.io/v1alpha2"
	devboxOwnerKind       = "Devbox"
)

var wlog = logf.Log.WithName("pod-stargz-runtime-injector")

type PodRuntimeClassInjector struct {
	decoder          admission.Decoder
	runtimeClassName string
	registries       []string
	skipAnnotation   string
}

var _ admission.Handler = (*PodRuntimeClassInjector)(nil)

func NewPodRuntimeClassInjector(
	decoder admission.Decoder,
	runtimeClassName string,
	registries []string,
	skipAnnotation string,
) *PodRuntimeClassInjector {
	return &PodRuntimeClassInjector{
		decoder:          decoder,
		runtimeClassName: runtimeClassName,
		registries:       registries,
		skipAnnotation:   skipAnnotation,
	}
}

func (i *PodRuntimeClassInjector) Handle(
	ctx context.Context,
	req admission.Request,
) admission.Response {
	wlog.Info("mutating pod",
		"namespace", req.Namespace,
		"name", req.Name,
		"operation", req.Operation,
		"uid", req.UID,
	)

	pod := &corev1.Pod{}
	if err := i.decoder.Decode(req, pod); err != nil {
		wlog.Error(err, "failed to decode pod", "namespace", req.Namespace, "name", req.Name)
		return admission.Errored(400, err)
	}

	mutated := pod.DeepCopy()
	inject, reason := i.shouldInject(mutated)
	if !inject {
		wlog.Info("skipping stargz injection",
			"namespace", pod.Namespace,
			"name", pod.Name,
			"reason", reason,
		)
		return admission.Allowed("pod does not require stargz runtime")
	}

	matchedImages := i.matchedInternalImages(mutated)
	wlog.Info("injecting stargz runtimeClassName",
		"namespace", pod.Namespace,
		"name", pod.Name,
		"runtimeClassName", i.runtimeClassName,
		"matchedImages", strings.Join(matchedImages, ","),
	)

	mutated.Spec.RuntimeClassName = &i.runtimeClassName
	mutatedRaw, err := json.Marshal(mutated)
	if err != nil {
		wlog.Error(
			err,
			"failed to marshal mutated pod",
			"namespace",
			pod.Namespace,
			"name",
			pod.Name,
		)
		return admission.Errored(500, err)
	}
	return admission.PatchResponseFromRaw(req.Object.Raw, mutatedRaw)
}

func (i *PodRuntimeClassInjector) shouldInject(pod *corev1.Pod) (bool, string) {
	if strings.EqualFold(pod.Annotations[i.skipAnnotation], "true") {
		return false, "skip annotation"
	}
	if isDevboxPod(pod) {
		return false, "devbox pod"
	}
	if pod.Spec.RuntimeClassName != nil && *pod.Spec.RuntimeClassName != "" {
		return false, "runtimeClassName already set: " + *pod.Spec.RuntimeClassName
	}
	if !i.podUsesInternalRegistry(pod) {
		return false, "no internal registry image"
	}
	return true, "internal registry image matched"
}

func (i *PodRuntimeClassInjector) podUsesInternalRegistry(pod *corev1.Pod) bool {
	return len(i.matchedInternalImages(pod)) > 0
}

func (i *PodRuntimeClassInjector) matchedInternalImages(pod *corev1.Pod) []string {
	var matched []string
	for _, c := range pod.Spec.InitContainers {
		if i.imageMatches(c.Image) {
			matched = append(matched, c.Image)
		}
	}
	for _, c := range pod.Spec.Containers {
		if i.imageMatches(c.Image) {
			matched = append(matched, c.Image)
		}
	}
	for _, c := range pod.Spec.EphemeralContainers {
		if i.imageMatches(c.Image) {
			matched = append(matched, c.Image)
		}
	}
	return matched
}

func isDevboxPod(pod *corev1.Pod) bool {
	for _, ref := range pod.OwnerReferences {
		if ref.Kind == devboxOwnerKind &&
			ref.APIVersion == devboxOwnerAPIVersion &&
			ref.Controller != nil && *ref.Controller {
			return true
		}
	}
	return false
}

func (i *PodRuntimeClassInjector) imageMatches(image string) bool {
	registry := ImageRegistry(image)
	for _, candidate := range i.registries {
		if registry == candidate {
			return true
		}
	}
	return false
}

func ImageRegistry(image string) string {
	parts := strings.SplitN(image, "/", 2)
	if len(parts) == 1 {
		return "docker.io"
	}
	first := parts[0]
	if strings.Contains(first, ".") || strings.Contains(first, ":") || first == "localhost" {
		return first
	}
	return "docker.io"
}

func SplitRegistries(raw string) []string {
	var out []string
	seen := map[string]bool{}
	for _, item := range strings.Split(raw, ",") {
		item = strings.TrimSpace(item)
		item = strings.TrimPrefix(item, "http://")
		item = strings.TrimPrefix(item, "https://")
		item = strings.TrimSuffix(item, "/")
		if item != "" && !seen[item] {
			seen[item] = true
			out = append(out, item)
		}
	}
	return out
}
