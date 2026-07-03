package webhook

import (
	"context"
	"encoding/json"
	"testing"

	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

func TestShouldInjectForInternalRegistry(t *testing.T) {
	injector := newTestInjector()
	pod := podWithImage("hub.staging-usw-1.sealos.io/ns-admin/devbox:v1")

	if inject, _ := injector.shouldInject(pod); !inject {
		t.Fatal("expected internal registry image to require injection")
	}
}

func TestShouldNotInjectForPublicRegistry(t *testing.T) {
	injector := newTestInjector()
	for _, image := range []string{"busybox:1.36", "library/busybox:1.36", "docker.io/library/busybox:1.36"} {
		if inject, _ := injector.shouldInject(podWithImage(image)); inject {
			t.Fatalf("expected public image %s not to require injection", image)
		}
	}
}

func TestShouldNotOverwriteRuntimeClass(t *testing.T) {
	injector := newTestInjector()
	existing := "kata"
	pod := podWithImage("hub.staging-usw-1.sealos.io/ns-admin/devbox:v1")
	pod.Spec.RuntimeClassName = &existing

	if inject, _ := injector.shouldInject(pod); inject {
		t.Fatal("expected existing runtimeClassName to be preserved")
	}
}

func TestShouldHonorSkipAnnotation(t *testing.T) {
	injector := newTestInjector()
	pod := podWithImage("hub.staging-usw-1.sealos.io/ns-admin/devbox:v1")
	pod.Annotations = map[string]string{"stargz.sealos.io/skip": "true"}

	if inject, _ := injector.shouldInject(pod); inject {
		t.Fatal("expected skip annotation to disable injection")
	}
}

func TestShouldNotInjectDevboxPod(t *testing.T) {
	injector := newTestInjector()
	pod := podWithImage("hub.staging-usw-1.sealos.io/ns-admin/devbox:v1")
	pod.OwnerReferences = []metav1.OwnerReference{{
		APIVersion: "devbox.sealos.io/v1alpha2",
		Kind:       "Devbox",
		Name:       "my-devbox",
		UID:        "abc-123",
		Controller: ptr.To(true),
	}}

	if inject, reason := injector.shouldInject(pod); inject {
		t.Fatalf("expected devbox pod not to require injection, got reason %q", reason)
	}
}

func TestHandleReturnsRuntimeClassPatch(t *testing.T) {
	injector := newTestInjector()

	raw := mustJSON(t, podWithImage("hub.staging-usw-1.sealos.io/ns-admin/devbox:v1"))
	resp := injector.Handle(context.Background(), admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Object: runtime.RawExtension{Raw: raw},
		},
	})
	if !resp.Allowed {
		t.Fatalf("expected allowed response: %+v", resp.Result)
	}
	if len(resp.Patches) != 1 {
		t.Fatalf("expected one patch, got %d: %+v", len(resp.Patches), resp.Patches)
	}
	if resp.Patches[0].Operation != "add" || resp.Patches[0].Path != "/spec/runtimeClassName" {
		t.Fatalf("unexpected patch: %+v", resp.Patches[0])
	}
}

func TestSplitRegistries(t *testing.T) {
	got := SplitRegistries(
		"https://hub.staging-usw-1.sealos.io/, registry.internal:5000,hub.staging-usw-1.sealos.io",
	)
	want := []string{"hub.staging-usw-1.sealos.io", "registry.internal:5000"}
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
}

func newTestInjector() *PodRuntimeClassInjector {
	return NewPodRuntimeClassInjector(
		admission.NewDecoder(testScheme()),
		"stargz",
		[]string{"hub.staging-usw-1.sealos.io"},
		"stargz.sealos.io/skip",
	)
}

func podWithImage(image string) *corev1.Pod {
	return &corev1.Pod{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Pod",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: "test",
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{{
				Name:  "app",
				Image: image,
			}},
		},
	}
}

func testScheme() *runtime.Scheme {
	scheme := runtime.NewScheme()
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	return scheme
}

func mustJSON(t *testing.T, obj any) []byte {
	t.Helper()
	raw, err := json.Marshal(obj)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return raw
}
