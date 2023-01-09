package controllers

import (
	"context"
	"errors"

	"github.com/go-logr/logr"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type DataHelper struct {
	client.Client
	logr.Logger
}

var ErrNotMatch = errors.New("NotMatch")

type MatchingLabelsModifier func(name any, labels client.MatchingLabels)

func orgModifier(name any, labels client.MatchingLabels) {
	labels[imagehubv1.SealosOrgLable] = name.(imagehubv1.OrgCombinator).GetOrg()
}

func repoModifier(name any, labels client.MatchingLabels) {
	labels[imagehubv1.SealosRepoLabel] = name.(imagehubv1.RepoCombinator).GetRepo()
}

func tagModifier(name any, labels client.MatchingLabels) {
	labels[imagehubv1.SealosTagLabel] = name.(imagehubv1.TagCombinator).GetTag()
}

func listByLable[R client.ObjectList](ctx context.Context, r *DataHelper, result R, name any, modifiers ...MatchingLabelsModifier) (R, error) {
	r.Logger.Info("getRepoListByOrgName", "name", name)
	labels := make(client.MatchingLabels)
	for _, modifier := range modifiers {
		modifier(name, labels)
	}
	err := r.Client.List(ctx, result, labels)
	return result, client.IgnoreNotFound(err)
}

// todo add org info and edit this!
func (r *DataHelper) getOrgInfoByOrgName(ctx context.Context, name imagehubv1.OrgName) (imagehubv1.OrgInfo, error) {
	return imagehubv1.OrgInfo{}, nil
}

func (r *DataHelper) getRepoListByOrgName(ctx context.Context, name imagehubv1.OrgName) (*imagehubv1.RepositoryList, error) {
	res := &imagehubv1.RepositoryList{}
	return listByLable[*imagehubv1.RepositoryList](ctx, r, res, &name, orgModifier)
}

func (r *DataHelper) getRepoByRepoName(ctx context.Context, name imagehubv1.RepoName) (imagehubv1.Repository, error) {
	res := &imagehubv1.RepositoryList{}
	lst, err := listByLable[*imagehubv1.RepositoryList](ctx, r, res, &name, orgModifier, repoModifier)
	if len(lst.Items) == 0 {
		return imagehubv1.Repository{}, ErrNotMatch
	}
	return lst.Items[0], err
}

func (r *DataHelper) getRepoInfoByRepoName(ctx context.Context, name imagehubv1.RepoName) (imagehubv1.RepoInfo, error) {
	repo, err := r.getRepoByRepoName(ctx, name)
	if err != nil {
		return imagehubv1.RepoInfo{}, err
	}
	return imagehubv1.RepoInfo(repo.Status), nil
}

//func (r *DataHelper) getImageListByOrgName(ctx context.Context, name imagehubv1.OrgName) (*imagehubv1.ImageList, error) {
//	res := &imagehubv1.ImageList{}
//	return listByLable[*imagehubv1.ImageList](ctx, r, res, &name, orgModifier, repoModifier)
//}

func (r *DataHelper) GetImageListByRepoName(ctx context.Context, name imagehubv1.RepoName) (*imagehubv1.ImageList, error) {
	res := &imagehubv1.ImageList{}
	return listByLable[*imagehubv1.ImageList](ctx, r, res, &name, orgModifier, repoModifier)
}

func (r *DataHelper) GetImageByImageName(ctx context.Context, name imagehubv1.ImageName) (imagehubv1.Image, error) {
	res := &imagehubv1.ImageList{}
	lst, err := listByLable[*imagehubv1.ImageList](ctx, r, res, &name, orgModifier, repoModifier, tagModifier)
	if len(lst.Items) == 0 {
		return imagehubv1.Image{}, ErrNotMatch
	}
	return lst.Items[0], err
}

func (r *DataHelper) GetImageInfoByImageName(ctx context.Context, name imagehubv1.ImageName) (imagehubv1.ImageInfo, error) {
	image, err := r.GetImageByImageName(ctx, name)
	if err != nil {
		return imagehubv1.ImageInfo{}, err
	}
	return imagehubv1.ImageInfo(image.Spec), nil
}

func (r *DataHelper) genFulldataByImageName(ctx context.Context, n imagehubv1.ImageName) (imagehubv1.FullData, error) {
	fd := imagehubv1.FullData{}

	orgInfo, err := r.getOrgInfoByOrgName(ctx, n.ToOrgName())
	if err == ErrNotMatch {
		r.Logger.V(2).Info("failed to get origination info by", "org name", n.ToOrgName(), "err", err.Error())
	} else if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.OrgInfo = orgInfo

	repoInfo, err := r.getRepoInfoByRepoName(ctx, n.ToRepoName())
	if err == ErrNotMatch {
		r.Logger.V(2).Info("failed to get repository info by", "repo name", n.ToRepoName(), "err", err.Error())
	} else if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.RepoInfo = repoInfo

	imgInfo, err := r.GetImageInfoByImageName(ctx, n)
	if err == ErrNotMatch {
		r.Logger.V(2).Info("failed to get image info by", "image name", n.ToMetaName(), "err", err.Error())
	} else if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.ImageInfo = imgInfo

	return fd, nil
}

func removeDuplicateElement(input []string) []string {
	result := make([]string, 0, len(input))
	temp := map[string]struct{}{}
	for _, item := range input {
		if _, ok := temp[item]; !ok {
			temp[item] = struct{}{}
			result = append(result, item)
		}
	}
	return result
}
