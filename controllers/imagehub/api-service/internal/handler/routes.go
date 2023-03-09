package handler

import (
	"net/http"

	"github.com/labring/sealos/controllers/imagehub/api-service/internal/svc"

	"github.com/zeromicro/go-zero/rest"
)

func RegisterHandlers(server *rest.Server, serverCtx *svc.ServiceContext) {
	server.AddRoutes(
		[]rest.Route{
			{
				Method:  http.MethodPost,
				Path:    "/apis/get/counter",
				Handler: getCounterHandler(serverCtx),
			},
			{
				Method:  http.MethodPost,
				Path:    "/apis/update/counter",
				Handler: updateCounterHandler(serverCtx),
			},
		},
	)
}
