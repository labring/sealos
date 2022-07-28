package care

import (
	"github.com/labring/lvscare/pkg/route"
	"github.com/labring/sealos/pkg/utils/logger"
)

type routeImpl struct {
	*route.Route
}

func newRouteImpl(target, gw string) (Ruler, error) {
	return &routeImpl{
		route.New(target, gw),
	}, nil
}

func (impl *routeImpl) Setup() error {
	logger.Info("Trying to add route")
	return impl.SetRoute()
}

func (impl *routeImpl) Cleanup() error {
	logger.Info("Trying to delete route")
	return impl.DelRoute()
}
