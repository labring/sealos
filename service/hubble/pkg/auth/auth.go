package auth

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	authorizationapi "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

type Auth struct {
	whiteListHosts []string
}

func NewAuth(whiteList string) *Auth {
	whiteListHosts := strings.Split(whiteList, ",")
	return &Auth{
		whiteListHosts: whiteListHosts,
	}
}

func (a *Auth) isWhitelistedHost(host string) bool {
	for _, h := range a.whiteListHosts {
		if h != "" && h == host {
			return true
		}
	}
	return false
}

func extractNamespaceFromKubeConfig(kubeConfigData string) (string, error) {
	config, err := clientcmd.Load([]byte(kubeConfigData))
	if err != nil {
		return "", fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	currentContext := config.CurrentContext
	if currentContext == "" {
		return "", errors.New("no current-context found in kubeconfig")
	}

	context, exists := config.Contexts[currentContext]
	if !exists {
		return "", fmt.Errorf("current-context '%s' not found in kubeconfig", currentContext)
	}

	namespace := context.Namespace
	if namespace == "" {
		return "", errors.New("no namespace found in kubeconfig")
	}

	return namespace, nil
}

func (a *Auth) Authenticate(ctx context.Context, ns, kc string) (string, error) {
	if ns == "" {
		var err error
		ns, err = extractNamespaceFromKubeConfig(kc)
		if err != nil {
			return "", ErrNoNamespace
		}
	}

	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kc))
	if err != nil {
		return "", fmt.Errorf("kubeconfig failed: %w", err)
	}

	if !a.isWhitelistedHost(config.Host) {
		if k8shost := getKubernetesHostFromEnv(); k8shost != "" {
			config.Host = k8shost
		} else {
			log.Printf("k8s host not found (%s)\n", config.Host)
			return "", ErrNoSealosHost
		}
	}
	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return "", fmt.Errorf("failed to create client: %w", err)
	}
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return "", fmt.Errorf("failed to create discovery client: %w", err)
	}
	res, err := discoveryClient.RESTClient().Get().AbsPath("/readyz").DoRaw(ctx)
	if err != nil {
		return "", fmt.Errorf("API server health check failed: %w", err)
	}
	if string(res) != "ok" {
		return "", fmt.Errorf("API server not ready: %s", string(res))
	}
	if err := checkResourceAccess(ctx, client, ns, "get", "pods"); err != nil {
		return "", fmt.Errorf("resource access check failed: %w", err)
	}

	return ns, nil
}

func getKubernetesHostFromEnv() string {
	host, port := os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if len(host) == 0 || len(port) == 0 {
		return ""
	}
	return "https://" + net.JoinHostPort(host, port)
}

func checkResourceAccess(
	ctx context.Context,
	client *kubernetes.Clientset,
	namespace, verb, resource string,
) error {
	review := &authorizationapi.SelfSubjectAccessReview{
		Spec: authorizationapi.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationapi.ResourceAttributes{
				Namespace: namespace,
				Verb:      verb,
				Group:     "",
				Version:   "v1",
				Resource:  resource,
			},
		},
	}

	resp, err := client.AuthorizationV1().
		SelfSubjectAccessReviews().
		Create(ctx, review, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	if !resp.Status.Allowed {
		return ErrNoAuth
	}
	return nil
}
