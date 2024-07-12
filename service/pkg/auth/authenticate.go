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

var (
	ErrNilNs        = errors.New("namespace not found")
	ErrNoAuth       = errors.New("no permission for this namespace")
	ErrNoSealosHost = errors.New("unable to get the sealos host")

	whiteListKubernetesHosts []string
)

func Authenticate(ns, kc string) error {
	if ns == "" {
		return ErrNilNs
	}
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kc))
	if err != nil {
		log.Printf("kubeconfig failed (%s)\n", kc)
		return fmt.Errorf("kubeconfig failed  %v", err)
	}
	if !IsWhitelistKubernetesHost(config.Host) {
		if k8shost := GetKubernetesHostFromEnv(); k8shost != "" {
			config.Host = k8shost
		} else {
			return ErrNoSealosHost
		}
	}

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to new client: %v", err)
	}
	discovery, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to new discovery client: %v", err)
	}
	res, err := discovery.RESTClient().Get().AbsPath("/readyz").DoRaw(context.Background())
	if err != nil {
		log.Println("Authenticate false, ping apiserver error")
		return fmt.Errorf("ping apiserver error: %v", err)
	}
	if string(res) != "ok" {
		log.Println("Authenticate false, response not ok")
		return fmt.Errorf("ping apiserver is no ok: %v", string(res))
	}

	if err := CheckResourceAccess(client, ns, "get", "pods"); err != nil {
		// fmt.Println(err.Error())
		return fmt.Errorf("check resource access error: %v", err)
	}

	return nil
}

func IsWhitelistKubernetesHost(host string) bool {
	for _, h := range whiteListKubernetesHosts {
		if h == host {
			return true
		}
	}
	return false
}

func GetKubernetesHostFromEnv() string {
	host, port := os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if len(host) == 0 || len(port) == 0 {
		return ""
	}
	return "https://" + net.JoinHostPort(host, port)
}

func CheckResourceAccess(client *kubernetes.Clientset, namespace, verb, resource string) error {
	// same to kubectl auth can-i
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
	resp, err := client.AuthorizationV1().SelfSubjectAccessReviews().Create(context.TODO(), review, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	if !resp.Status.Allowed {
		return ErrNoAuth
	}
	return nil
}

func init() {
	whiteListKubernetesHosts = strings.Split(os.Getenv("WHITELIST_KUBERNETES_HOSTS"), ",")
	fmt.Println("WHITELIST_KUBERNETES_HOSTS", whiteListKubernetesHosts)
}
