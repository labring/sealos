package controllers

import (
	"context"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type ActionEngine interface {
	Parse() error
	Apply() error
}

type KubectlEngine struct {
	ctx         context.Context
	Client      client.Client
	ActionReq   *appv1.Actions
	imageInfo   *imagev1.Image
	parseResult []byte
}

func NewKubectlEngine(ctx context.Context, client client.Client, actionReq *appv1.Actions, image *imagev1.Image) *KubectlEngine {
	return &KubectlEngine{
		ctx:       ctx,
		Client:    client,
		ActionReq: actionReq,
		imageInfo: image,
	}
}
