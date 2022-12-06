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

type OrgCombinator interface {
	GetOrg() string
}

type RepoCombinator interface {
	GetRepo() string
}

type TagCombinator interface {
	GetTag() string
}

func orgModifier(name any, labels client.MatchingLabels) {
	labels[imagehubv1.SealosOrgLable] = name.(OrgCombinator).GetOrg()
}

func repoModifier(name any, labels client.MatchingLabels) {
	labels[imagehubv1.SealosRepoLabel] = name.(RepoCombinator).GetRepo()
}

func tagModifier(name any, labels client.MatchingLabels) {
	labels[imagehubv1.SealosTagLabel] = name.(TagCombinator).GetTag()
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

func (r *DataHelper) getImageListByRepoName(ctx context.Context, name imagehubv1.RepoName) (*imagehubv1.ImageList, error) {
	res := &imagehubv1.ImageList{}
	return listByLable[*imagehubv1.ImageList](ctx, r, res, &name, orgModifier, repoModifier)
}

func (r *DataHelper) getImageByImageName(ctx context.Context, name imagehubv1.ImageName) (imagehubv1.Image, error) {
	res := &imagehubv1.ImageList{}
	lst, err := listByLable[*imagehubv1.ImageList](ctx, r, res, &name, orgModifier, repoModifier, tagModifier)
	if len(lst.Items) == 0 {
		return imagehubv1.Image{}, ErrNotMatch
	}
	return lst.Items[0], err
}

func (r *DataHelper) getImageInfoByImageName(ctx context.Context, name imagehubv1.ImageName) (imagehubv1.ImageInfo, error) {
	image, err := r.getImageByImageName(ctx, name)
	if err != nil {
		return imagehubv1.ImageInfo{}, err
	}
	return imagehubv1.ImageInfo(image.Spec), nil
}

func (r *DataHelper) genFulldataByImageName(ctx context.Context, n imagehubv1.ImageName) (imagehubv1.FullData, error) {
	fd := imagehubv1.FullData{}

	orgInfo, err := r.getOrgInfoByOrgName(ctx, n.ToOrgName())
	if err == ErrNotMatch {
		r.Logger.V(2).Info("getOrgInfoByOrgName", "err:", err.Error())
	} else if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.OrgInfo = orgInfo

	repoInfo, err := r.getRepoInfoByRepoName(ctx, n.ToRepoName())
	if err == ErrNotMatch {
		r.Logger.V(2).Info("getRepoInfoByRepoName", "err:", err.Error())
	} else if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.RepoInfo = repoInfo

	imgInfo, err := r.getImageInfoByImageName(ctx, n)
	if err == ErrNotMatch {
		r.Logger.V(2).Info("getImageInfoByImageName", "err:", err.Error())
	} else if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.ImageInfo = imgInfo

	return fd, nil
}
