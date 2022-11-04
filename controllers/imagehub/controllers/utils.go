package controllers

import (
	"context"
	"fmt"

	"github.com/go-logr/logr"
	imagehubv1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type DataBase struct {
	client.Client
	logr.Logger
}

// todo add org info and edit this!
func (r *DataBase) getOrgInfo(ctx context.Context, name imagehubv1.OrgName) (imagehubv1.OrgInfo, error) {
	return imagehubv1.OrgInfo{}, nil
}

func (r *DataBase) getRepo(ctx context.Context, name imagehubv1.RepoName) (imagehubv1.Repository, error) {
	r.Logger.Info("getRepo", "name", name)
	repos := &imagehubv1.RepositoryList{}
	if err := r.List(ctx, repos, client.MatchingLabels{
		imagehubv1.SealosOrgLable:  name.GetOrg(),
		imagehubv1.SealosRepoLabel: name.GetRepo(),
	}); err != nil {
		return imagehubv1.Repository{}, client.IgnoreNotFound(err)
	}
	if len(repos.Items) == 0 {
		r.Logger.Info("not found repo name", "name", name)
		return imagehubv1.Repository{}, fmt.Errorf("error not found repo name")
	}
	// if not only one repo was selected, should raise an error?
	return repos.Items[0], nil
}

func (r *DataBase) getRepoInfo(ctx context.Context, name imagehubv1.RepoName) (imagehubv1.RepoInfo, error) {
	repo, err := r.getRepo(ctx, name)
	if err != nil {
		return imagehubv1.RepoInfo{}, err
	}
	return imagehubv1.RepoInfo(repo.Spec), nil
}

func (r *DataBase) getImage(ctx context.Context, name imagehubv1.ImageName) (imagehubv1.Image, error) {
	r.Logger.Info("getImage", "name", name)
	images := &imagehubv1.ImageList{}
	if err := r.List(ctx, images, client.MatchingLabels{
		imagehubv1.SealosOrgLable:  name.GetOrg(),
		imagehubv1.SealosRepoLabel: name.GetRepo(),
		imagehubv1.SealosTagLabel:  name.GetTag(),
	}); err != nil {
		return imagehubv1.Image{}, client.IgnoreNotFound(err)
	}
	if len(images.Items) == 0 {
		r.Logger.Info("not found image name", "name", name)
		return imagehubv1.Image{}, fmt.Errorf("error not found image name")
	}
	// if not only one image was selected, should raise an error?
	return images.Items[0], nil
}

func (r *DataBase) getImageInfo(ctx context.Context, name imagehubv1.ImageName) (imagehubv1.ImageInfo, error) {
	image, err := r.getImage(ctx, name)
	if err != nil {
		return imagehubv1.ImageInfo{}, err
	}
	return imagehubv1.ImageInfo(image.Spec), nil
}

func (r *DataBase) genFulldata(ctx context.Context, n imagehubv1.ImageName) (imagehubv1.FullData, error) {
	fd := imagehubv1.FullData{}

	orgInfo, err := r.getOrgInfo(ctx, n.ToOrgName())
	if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.OrgInfo = orgInfo

	repoInfo, err := r.getRepoInfo(ctx, n.ToRepoName())
	if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.RepoInfo = repoInfo

	imgInfo, err := r.getImageInfo(ctx, n)
	if err != nil {
		return imagehubv1.FullData{}, err
	}
	fd.ImageInfo = imgInfo

	return fd, nil
}
