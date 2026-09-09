// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	"go.etcd.io/etcd/client/pkg/v3/transport"
	clientv3 "go.etcd.io/etcd/client/v3"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	cri "k8s.io/cri-api/pkg/apis/runtime/v1"
	"sigs.k8s.io/yaml"
)

type runtimeClient struct {
	conn      *grpc.ClientConn
	imageConn *grpc.ClientConn
	cri.RuntimeServiceClient
	cri.ImageServiceClient
}

func dialCRI(ctx context.Context, endpoint string) (*grpc.ClientConn, error) {
	u, err := url.Parse(endpoint)
	if err != nil || u.Scheme != "unix" || u.Host != "" || u.Path == "" {
		return nil, fmt.Errorf("expected a local unix CRI endpoint, got %q", endpoint)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	return grpc.DialContext(
		ctx,
		endpoint,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", u.Path)
		}),
	)
}

func connectRuntime(ctx context.Context, endpoint string) (*runtimeClient, error) {
	conn, err := dialCRI(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	return &runtimeClient{
		conn:                 conn,
		RuntimeServiceClient: cri.NewRuntimeServiceClient(conn),
		ImageServiceClient:   cri.NewImageServiceClient(conn),
	}, nil
}

// Kubelet supports a separate CRI image service, including registry proxies.
// Match its flag-over-configuration precedence instead of bypassing that service.
func imageServiceEndpoint(args []string, config []byte) (string, error) {
	var settings struct {
		ImageServiceEndpoint string
	}
	if err := yaml.Unmarshal(config, &settings); err != nil {
		return "", err
	}
	if endpoint := flagValue(args, "image-service-endpoint"); endpoint != "" {
		return endpoint, nil
	}
	return settings.ImageServiceEndpoint, nil
}

func connectKubeletRuntime(
	ctx context.Context,
	endpoint string,
	args []string,
	config []byte,
) (*runtimeClient, error) {
	imageEndpoint, err := imageServiceEndpoint(args, config)
	if err != nil {
		return nil, err
	}
	runtime, err := connectRuntime(ctx, endpoint)
	if err != nil {
		return nil, err
	}
	if imageEndpoint == "" || imageEndpoint == endpoint {
		return runtime, nil
	}
	runtime.imageConn, err = dialCRI(ctx, imageEndpoint)
	if err != nil {
		runtime.close()
		return nil, fmt.Errorf("connect kubelet image service: %w", err)
	}
	runtime.ImageServiceClient = cri.NewImageServiceClient(runtime.imageConn)
	return runtime, nil
}

func (r *runtimeClient) close() {
	if r.imageConn != nil {
		r.imageConn.Close()
	}
	r.conn.Close()
}

func (r *runtimeClient) sandbox(ctx context.Context, name string) (*cri.PodSandbox, error) {
	response, err := r.ListPodSandbox(ctx, &cri.ListPodSandboxRequest{})
	if err != nil {
		return nil, err
	}
	var found *cri.PodSandbox
	for _, sandbox := range response.Items {
		if sandbox.Metadata.GetNamespace() != "kube-system" || sandbox.Metadata.GetName() != name ||
			sandbox.State != cri.PodSandboxState_SANDBOX_READY {
			continue
		}
		if found != nil {
			return nil, fmt.Errorf("multiple ready sandboxes for %s", name)
		}
		found = sandbox
	}
	if found == nil {
		return nil, fmt.Errorf("no ready sandbox for %s", name)
	}
	return found, nil
}

func (r *runtimeClient) runningImage(
	ctx context.Context,
	sandboxID, containerName, image string,
) error {
	response, err := r.ListContainers(ctx, &cri.ListContainersRequest{
		Filter: &cri.ContainerFilter{
			PodSandboxId: sandboxID,
		},
	})
	if err != nil {
		return err
	}
	for _, c := range response.Containers {
		if c.Metadata.GetName() == containerName &&
			c.State == cri.ContainerState_CONTAINER_RUNNING {
			if image != "" {
				// CRI permits multiple references for an image. Resolve both to
				// the runtime's image ID instead of comparing reference strings.
				actual, err := r.ImageStatus(ctx, &cri.ImageStatusRequest{
					Image: &cri.ImageSpec{
						Image: c.ImageRef,
					},
				})
				if err != nil {
					return err
				}
				expected, err := r.ImageStatus(ctx, &cri.ImageStatusRequest{
					Image: &cri.ImageSpec{
						Image: image,
					},
				})
				if err != nil {
					return err
				}
				if actual.Image == nil || expected.Image == nil || actual.Image.Id == "" ||
					actual.Image.Id != expected.Image.Id {
					return fmt.Errorf("%s is running an unexpected image reference", containerName)
				}
			}
			return nil
		}
	}
	return fmt.Errorf("%s has no running container", containerName)
}

// Probe the generated manifest's health endpoint, as kubelet does for HTTP
// probes. TLS verification is skipped only for these unauthenticated probes.
func probe(ctx context.Context, pod *v1.Pod) error {
	c := pod.Spec.Containers[0]
	p := c.LivenessProbe
	if c.ReadinessProbe != nil {
		p = c.ReadinessProbe
	}
	if p == nil || p.HTTPGet == nil || p.HTTPGet.Port.IntVal == 0 {
		return fmt.Errorf("%s requires an HTTP health probe with a numeric port", pod.Name)
	}
	get := p.HTTPGet
	host := get.Host
	if host == "" {
		host = "127.0.0.1"
	}
	scheme := strings.ToLower(string(get.Scheme))
	if scheme == "" {
		scheme = "http"
	}
	u, err := url.Parse(get.Path)
	if err != nil {
		return err
	}
	u.Scheme = scheme
	u.Host = net.JoinHostPort(host, strconv.Itoa(int(get.Port.IntVal)))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return err
	}
	for _, header := range get.HTTPHeaders {
		req.Header.Add(header.Name, header.Value)
	}
	// Match kubelet HTTPS probes, which do not authenticate the serving certificate.
	// nosemgrep: problem-based-packs.insecure-transport.go-stdlib.bypass-tls-verification.bypass-tls-verification
	tr := &http.Transport{TLSClientConfig: &tls.Config{
		InsecureSkipVerify: true,
		MinVersion:         tls.VersionTLS12,
	}}
	defer tr.CloseIdleConnections()
	client := &http.Client{
		Transport: tr,
		Timeout:   5 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	response, err := client.Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("%s health returned HTTP %d", pod.Name, response.StatusCode)
	}
	return nil
}

func etcdConfig(api *v1.Pod) (clientv3.Config, error) {
	args := componentArgs(api)
	endpoints := strings.Split(flagValue(args, "etcd-servers"), ",")
	if len(endpoints) == 0 || endpoints[0] == "" {
		return clientv3.Config{}, errors.New("missing etcd endpoints in API server manifest")
	}
	tlsInfo := transport.TLSInfo{
		TrustedCAFile: flagValue(args, "etcd-cafile"),
		CertFile:      flagValue(args, "etcd-certfile"),
		KeyFile:       flagValue(args, "etcd-keyfile"),
	}
	tlsConfig, err := tlsInfo.ClientConfig()
	if err != nil {
		return clientv3.Config{}, err
	}
	return clientv3.Config{
		Endpoints:   endpoints,
		TLS:         tlsConfig,
		DialTimeout: 5 * time.Second,
	}, nil
}

func etcdHealthy(ctx context.Context, client *clientv3.Client) error {
	members, err := client.MemberList(ctx)
	if err != nil {
		return err
	}
	if len(members.Members) == 0 {
		return errors.New("etcd has no members")
	}
	for _, m := range members.Members {
		if m.IsLearner || len(m.ClientURLs) == 0 {
			return errors.New("etcd membership is still changing")
		}
		for _, endpoint := range m.ClientURLs {
			status, err := client.Status(ctx, endpoint)
			if err != nil {
				return err
			}
			if status.Leader == 0 || status.Header.MemberId != m.ID || len(status.Errors) != 0 {
				return fmt.Errorf("etcd member %x is unhealthy", m.ID)
			}
		}
	}
	alarms, err := client.AlarmList(ctx)
	if err != nil {
		return err
	}
	if len(alarms.Alarms) != 0 {
		return errors.New("etcd has active alarms")
	}
	// A linearizable read confirms that the cluster can still reach consensus.
	_, err = client.Get(ctx, "/sealos/standalone-upgrade-health")
	return err
}

func apiVersion(ctx context.Context, pod *v1.Pod) (string, error) {
	args := componentArgs(pod)
	endpoint := "https://" + net.JoinHostPort(
		flagValue(args, "advertise-address"),
		flagValue(args, "secure-port"),
	)
	config, err := clientcmd.BuildConfigFromFlags(endpoint, "/etc/kubernetes/admin.conf")
	if err != nil {
		return "", err
	}
	config.Timeout = 5 * time.Second
	client, err := rest.HTTPClientFor(config)
	if err != nil {
		return "", err
	}
	defer client.CloseIdleConnections()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"/version", nil)
	if err != nil {
		return "", err
	}
	response, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("local API version returned HTTP %d", response.StatusCode)
	}
	var info version.Info
	if err := json.NewDecoder(response.Body).Decode(&info); err != nil {
		return "", err
	}
	return info.GitVersion, nil
}

func etcdImageVersion(image string) (*semver.Version, error) {
	if strings.Contains(image, "@") {
		return nil, errors.New("cannot infer the etcd version from a digest-only image")
	}
	tag := image[strings.LastIndex(image, ":")+1:]
	v, err := semver.NewVersion(tag)
	if err != nil {
		return nil, fmt.Errorf("cannot infer the etcd version from image %q: %w", image, err)
	}
	return semver.NewVersion(fmt.Sprintf("%d.%d.%d", v.Major(), v.Minor(), v.Patch()))
}

func validateEtcdPeerVersion(current, target *semver.Version, peerVersion string) error {
	peer, err := semver.NewVersion(peerVersion)
	if err != nil {
		return err
	}
	if peer.Major() != target.Major() || target.LessThan(peer) || target.Minor() > peer.Minor()+1 {
		return fmt.Errorf("etcd peer %s is incompatible with target %s", peer, target)
	}
	if target.Minor() > current.Minor() && peer.Minor() < current.Minor() {
		return fmt.Errorf("finish the previous etcd minor upgrade before upgrading to %s", target)
	}
	if target.Major() == 3 && target.Minor() == 6 && peer.Minor() == 5 && peer.Patch() < 32 {
		return fmt.Errorf(
			"etcd 3.6 upgrade requires all 3.5 members at 3.5.32 or later; found %s",
			peer,
		)
	}
	return nil
}
