package handler

import (
	"net/http"

	"github.com/labring/sealos/controllers/imagehub/api-service/internal/logic"
	"github.com/labring/sealos/controllers/imagehub/api-service/internal/svc"
	"github.com/labring/sealos/controllers/imagehub/api-service/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func getCounterHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.GetCounterReq
		if err := httpx.Parse(r, &req); err != nil {
			httpx.Error(w, err)
			return
		}

		// authenticate
		res, uk8s := logic.Authenticate(r.Context(), req.Kubeconfig)
		if res == false {
			return
		}

		// enter get counter logic
		l := logic.NewGetCounterLogic(r.Context(), svcCtx, uk8s)
		resp, err := l.GetCounter(&req)
		if err != nil {
			httpx.Error(w, err)
		} else {
			httpx.OkJson(w, resp)
		}
	}
}
