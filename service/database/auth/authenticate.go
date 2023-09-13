package auth

import (
	"context"
	"github.com/labring/sealos/service/database/api"
	authorizationapi "k8s.io/api/authorization/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"log"
	"net"
	"os"
)

func Authenticate(namespace, password string) error {
	if namespace == "" {
		return api.ErrNilNs
	}
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(password))
	if err != nil {
		log.Printf("kubeconfig failed (%s)\n", password)
		return err
	}

	if k8shost := GetKubernetesHostFromEnv(); k8shost != "" {
		config.Host = k8shost
	} else {
		return api.ErrNoSealosHost
	}

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}
	discovery, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return err
	}
	res, err := discovery.RESTClient().Get().AbsPath("/readyz").DoRaw(context.Background())
	if err != nil {
		log.Println("Authenticate false, ping apiserver error")
		return err
	}
	if string(res) != "ok" {
		log.Println("Authenticate false, response not ok")
		return err
	}

	if err := CheckResourceAccess(client, namespace, "get", "pods"); err != nil {
		// fmt.Println(err.Error())
		return err
	}

	return nil
}

func GetKubernetesHostFromEnv() string {
	host, port := os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if len(host) == 0 || len(port) == 0 {
		return ""
	}
	return "https://" + net.JoinHostPort(host, port)
}

func CheckResourceAccess(client *kubernetes.Clientset, namespace, verb, resource string) error {
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
		return api.ErrNoAuth
	}

	return nil
}
