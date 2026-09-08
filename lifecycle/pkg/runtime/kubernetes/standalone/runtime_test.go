// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strconv"
	"testing"

	"github.com/Masterminds/semver/v3"
	"google.golang.org/grpc"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
)

type fakeCRI struct {
	cri.RuntimeServiceClient
	cri.ImageServiceClient
	sandboxes []*cri.PodSandbox
	container *cri.Container
	images    map[string]*cri.Image
}

func (f *fakeCRI) ListPodSandbox(context.Context, *cri.ListPodSandboxRequest, ...grpc.CallOption) (*cri.ListPodSandboxResponse, error) {
	return &cri.ListPodSandboxResponse{Items: f.sandboxes}, nil
}

func (f *fakeCRI) ListContainers(context.Context, *cri.ListContainersRequest, ...grpc.CallOption) (*cri.ListContainersResponse, error) {
	return &cri.ListContainersResponse{Containers: []*cri.Container{f.container}}, nil
}

func (f *fakeCRI) ImageStatus(_ context.Context, request *cri.ImageStatusRequest, _ ...grpc.CallOption) (*cri.ImageStatusResponse, error) {
	return &cri.ImageStatusResponse{Image: f.images[request.Image.Image]}, nil
}

func TestSandboxRequiresUniqueReadyIdentity(t *testing.T) {
	fake := &fakeCRI{
		sandboxes: []*cri.PodSandbox{
			{
				Id:    "old",
				State: cri.PodSandboxState_SANDBOX_NOTREADY,
				Metadata: &cri.PodSandboxMetadata{
					Name:      "kube-apiserver-control-plane",
					Namespace: "kube-system",
				},
			},
			{
				Id:    "new",
				State: cri.PodSandboxState_SANDBOX_READY,
				Metadata: &cri.PodSandboxMetadata{
					Name:      "kube-apiserver-control-plane",
					Namespace: "kube-system",
				},
			},
			{
				Id:    "unrelated",
				State: cri.PodSandboxState_SANDBOX_READY,
				Metadata: &cri.PodSandboxMetadata{
					Name:      "kube-apiserver-control-plane",
					Namespace: "default",
				},
			},
		},
	}
	client := &runtimeClient{RuntimeServiceClient: fake}
	sandbox, err := client.sandbox(context.Background(), "kube-apiserver-control-plane")
	if err != nil || sandbox.Id != "new" {
		t.Fatalf("wrong sandbox: %v, %v", sandbox, err)
	}
	fake.sandboxes = append(fake.sandboxes, fake.sandboxes[1])
	if _, err := client.sandbox(context.Background(), "kube-apiserver-control-plane"); err == nil {
		t.Fatal("accepted ambiguous ready sandboxes")
	}
}

func TestRunningImageResolvesCRIReferences(t *testing.T) {
	fake := &fakeCRI{
		container: &cri.Container{
			Metadata: &cri.ContainerMetadata{
				Name: "kube-apiserver",
			},
			State:    cri.ContainerState_CONTAINER_RUNNING,
			ImageRef: "registry/image@sha256:manifest",
		},
		images: map[string]*cri.Image{
			"sha256:config":                  {Id: "sha256:config"},
			"registry/image@sha256:manifest": {Id: "sha256:config"},
		},
	}
	client := &runtimeClient{
		RuntimeServiceClient: fake,
		ImageServiceClient:   fake,
	}
	if err := client.runningImage(context.Background(), "sandbox", "kube-apiserver", "sha256:config"); err != nil {
		t.Fatal(err)
	}
	fake.images["registry/image@sha256:manifest"].Id = "sha256:old"
	if err := client.runningImage(context.Background(), "sandbox", "kube-apiserver", "sha256:config"); err == nil {
		t.Fatal("accepted a running container with the old image")
	}
}

func TestProbeRequiresSuccessfulLocalHealth(t *testing.T) {
	status := http.StatusServiceUnavailable
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/readyz" {
			t.Errorf("wrong probe path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("exclude") != "NOSPACE" {
			t.Errorf("probe query parameters were lost: %s", r.URL.RawQuery)
		}
		w.WriteHeader(status)
	}))
	defer server.Close()
	address, err := url.Parse(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	port, err := strconv.Atoi(address.Port())
	if err != nil {
		t.Fatal(err)
	}
	pod := &v1.Pod{
		Spec: v1.PodSpec{
			Containers: []v1.Container{
				{
					LivenessProbe: &v1.Probe{
						ProbeHandler: v1.ProbeHandler{
							HTTPGet: &v1.HTTPGetAction{
								Host: address.Hostname(),
								Port: intstr.FromInt(port),
								Path: "/readyz?exclude=NOSPACE",
							},
						},
					},
				},
			},
		},
	}
	if err := probe(context.Background(), pod); err == nil {
		t.Fatal("accepted unhealthy component")
	}
	status = http.StatusOK
	if err := probe(context.Background(), pod); err != nil {
		t.Fatal(err)
	}
}

func TestEtcdPeerVersionsAllowRollingUpgrade(t *testing.T) {
	tests := []struct {
		current string
		target  string
		peer    string
		valid   bool
	}{
		{"3.5.32", "3.6.0", "3.5.32", true},
		{"3.5.32", "3.6.0", "3.6.0", true},
		{"3.6.0", "3.6.0", "3.5.32", true},
		{"3.5.32", "3.6.0", "3.5.21", false},
		{"3.5.21", "3.6.0", "3.4.37", false},
		{"3.5.21", "3.6.0", "3.6.1", false},
		{"3.5.21", "3.6.0", "4.0.0", false},
	}
	for _, tt := range tests {
		t.Run(tt.current+"/"+tt.target+"/"+tt.peer, func(t *testing.T) {
			current := semver.MustParse(tt.current)
			target := semver.MustParse(tt.target)
			err := validateEtcdPeerVersion(current, target, tt.peer)
			if (err == nil) != tt.valid {
				t.Fatalf("valid=%t, got %v", tt.valid, err)
			}
		})
	}
}

type imageServiceFixture struct {
	cri.UnimplementedImageServiceServer
}

func (s *imageServiceFixture) ImageStatus(context.Context, *cri.ImageStatusRequest) (*cri.ImageStatusResponse, error) {
	return &cri.ImageStatusResponse{Image: &cri.Image{Id: "resolved-by-image-service"}}, nil
}

func TestSeparateKubeletImageService(t *testing.T) {
	start := func(name string, images bool) string {
		t.Helper()
		path := filepath.Join(t.TempDir(), name)
		listener, err := net.Listen("unix", path)
		if err != nil {
			t.Fatal(err)
		}
		server := grpc.NewServer()
		if images {
			cri.RegisterImageServiceServer(server, &imageServiceFixture{})
		}
		go server.Serve(listener)
		t.Cleanup(server.Stop)
		return "unix://" + path
	}
	runtimeEndpoint := start("runtime.sock", false)
	imageEndpoint := start("images.sock", true)
	for _, source := range []string{"configuration", "flag"} {
		t.Run(source, func(t *testing.T) {
			config := []byte("imageServiceEndpoint: " + imageEndpoint + "\n")
			var args []string
			if source == "flag" {
				config = []byte("imageServiceEndpoint: " + runtimeEndpoint + "\n")
				args = []string{"--image-service-endpoint=" + imageEndpoint}
			}
			client, err := connectKubeletRuntime(context.Background(), runtimeEndpoint, args, config)
			if err != nil {
				t.Fatal(err)
			}
			defer client.close()
			response, err := client.ImageStatus(context.Background(), &cri.ImageStatusRequest{Image: &cri.ImageSpec{Image: "registry/image:version"}})
			if err != nil {
				t.Fatal(err)
			}
			if response.Image.GetId() != "resolved-by-image-service" {
				t.Fatal("image lookup bypassed the configured service")
			}
		})
	}
}
