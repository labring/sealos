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

func (a SealosAuthorize) Authorize(client kubernetes.Client, ai *api.AuthRequestInfo) ([]string, error) {
	glog.Info("Authorize for req: ", ai.Name)

	repoName := imagehubv1.RepoName(ai.Name)
	var res []string

	// get repo using authzClient
	repoResource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "imagehub.sealos.io",
		Version:  "v1",
		Resource: "repositories",
	})
	unstructRepo, err := repoResource.Get(context.Background(), repoName.ToMetaName(), metav1.GetOptions{})
	if err != nil {
		glog.Infof("error when Authorize req: %s for user %s, get repo cr from apiserver error: %s", repoName, ai.Account, err)
		return nil, api.ErrNoMatch
	}
	repo := imagehubv1.Repository{}
	err = runtime.DefaultUnstructuredConverter.FromUnstructured(unstructRepo.UnstructuredContent(), &repo)
	if err != nil {
		glog.Infof("error when unstruct organization")
		return nil, api.ErrNoMatch
	}

	// get org using authzClient
	orgResource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "imagehub.sealos.io",
		Version:  "v1",
		Resource: "organizations",
	})
	unstructOrg, err := orgResource.Get(context.Background(), repoName.GetOrg(), metav1.GetOptions{})
	if err != nil {
		glog.Infof("error when Authorize req: %s for user %s, get org cr from apiserver error: %s ", repoName, ai.Account, err)
		return nil, api.ErrNoMatch
	}
	org := imagehubv1.Organization{}
	err = runtime.DefaultUnstructuredConverter.FromUnstructured(unstructOrg.UnstructuredContent(), &org)
	if err != nil {
		glog.Infof("error when unstruct organization")
		return nil, api.ErrNoMatch
	}

	// if repo is public, user can pull it anyway.
	if !repo.Spec.IsPrivate {
		res = append(res, "pull")
	}

	// if user is one of the org managers, user can pull and push it.
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

func NewSealosAuthz() SealosAuthorize {
	return SealosAuthorize{}
}
