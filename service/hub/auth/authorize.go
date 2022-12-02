package auth

import (
	"context"

	"github.com/cesanta/glog"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/service/hub/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func init() {
	glog.Info("authz plugin init function called")
}

type SealosAuthorize struct {
	api.Authorizer
}

func (a SealosAuthorize) Authorize(ai *api.AuthRequestInfo) ([]string, error) {
	glog.Info("Authorize for req: ", ai.Name)
	// todo replace server ip to env $(SERVER)

	repo := imagehubv1.RepoName(ai.Name)

	var res []string
	client, err := kubernetes.NewKubernetesClientByConfigString(ai.Kubeconfig)
	if err != nil {
		return res, api.ErrNoMatch
	}
	resource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "imagehub.sealos.io",
		Version:  "v1",
		Resource: "organizations",
	})
	unstructOrg, err := resource.Get(context.Background(), repo.GetOrg(), metav1.GetOptions{})
	if err != nil {
		glog.Infof("error when Authorize req: %s for user %s, get org cr from apiserver error", repo, ai.Account)
		return res, api.ErrNoMatch
	}
	org := imagehubv1.Organization{}
	err = runtime.DefaultUnstructuredConverter.FromUnstructured(unstructOrg.UnstructuredContent(), &org)
	if err != nil {
		glog.Infof("error when unstruct organization")
		return res, api.ErrNoMatch
	}
	// if org have repo, user can pull it.
	for _, r := range org.Spec.Repos {
		if r == repo {
			res = append(res, "pull")
			break
		}
	}

	// if org manager have user, user can push it.
	for _, r := range org.Spec.Manager {
		if r == ai.Account {
			res = append(res, "pull", "push")
			break
		}
	}

	glog.Info("Authorize true")
	return res, nil
}

func (a SealosAuthorize) Stop() {
}

func (a SealosAuthorize) Name() string {
	return "authz.hub.sealos.io"
}

func NewSealosAuthz() SealosAuthorize {
	return SealosAuthorize{}
}
