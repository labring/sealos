package logic

import (
	"context"

	"github.com/labring/sealos/controllers/imagehub/api-service/internal/svc"
	"github.com/labring/sealos/controllers/imagehub/api-service/internal/types"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/zeromicro/go-zero/core/logx"
)

type UpdateCounterLogic struct {
	logx.Logger
	ctx        context.Context
	uk8sClient kubernetes.Client
	svcCtx     *svc.ServiceContext
}

func NewUpdateCounterLogic(ctx context.Context, svcCtx *svc.ServiceContext, uk8sClient kubernetes.Client) *UpdateCounterLogic {
	return &UpdateCounterLogic{
		Logger:     logx.WithContext(ctx),
		ctx:        ctx,
		svcCtx:     svcCtx,
		uk8sClient: uk8sClient,
	}
}

func (l *UpdateCounterLogic) UpdateCounter(req *types.GetCounterReq) (resp *types.GetCounterReply, err error) {
	return
}
