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
				Path:    "",
				Handler: getCounterHandler(serverCtx),
			},
			{
				Method:  http.MethodPut,
				Path:    "/status",
				Handler: updateCounterHandler(serverCtx),
			},
		},
		rest.WithPrefix("/apis/counters.sealos.io/v1/namespace/:namespace/name/:name"),
	)
	// TODO add other routes
	//server.AddRoute()
}
