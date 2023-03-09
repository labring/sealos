package logic

import (
	"context"

	"github.com/labring/sealos/controllers/imagehub/api-service/internal/svc"
	"github.com/labring/sealos/controllers/imagehub/api-service/internal/types"
	"github.com/labring/sealos/pkg/client-go/kubernetes"

	"github.com/zeromicro/go-zero/core/logx"
)

type GetCounterLogic struct {
	logx.Logger
	ctx        context.Context
	uk8sClient kubernetes.Client
	svcCtx     *svc.ServiceContext
}

func NewGetCounterLogic(ctx context.Context, svcCtx *svc.ServiceContext, uk8sClient kubernetes.Client) *GetCounterLogic {
	return &GetCounterLogic{
		Logger:     logx.WithContext(ctx),
		ctx:        ctx,
		svcCtx:     svcCtx,
		uk8sClient: uk8sClient,
	}
}

func (l *GetCounterLogic) GetCounter(req *types.GetCounterReq) (resp *types.GetCounterReply, err error) {
	switch req.Type {
	case types.ImagePullCounter:
		resp, err = l.getImagePullCounter(req)
	case types.RepoPullCounter:
		resp, err = l.getRepoPullCounter(req)
	case types.RepoStarCounter:
		resp, err = l.getRepoStarCounter(req)
	}
	return
}

// TODO ADD LOGIC HERE

func (l *GetCounterLogic) getImagePullCounter(req *types.GetCounterReq) (resp *types.GetCounterReply, err error) {
	return &types.GetCounterReply{}, nil
}

func (l *GetCounterLogic) getRepoPullCounter(req *types.GetCounterReq) (*types.GetCounterReply, error) {
	return &types.GetCounterReply{}, nil
}

func (l *GetCounterLogic) getRepoStarCounter(req *types.GetCounterReq) (*types.GetCounterReply, error) {
	return &types.GetCounterReply{}, nil
}
