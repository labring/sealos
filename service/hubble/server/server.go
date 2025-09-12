package server

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/hubble/datastore"
	"github.com/labring/sealos/service/hubble/pkg/auth"
	"github.com/labring/sealos/service/hubble/pkg/constants"
	"github.com/labring/sealos/service/hubble/pkg/models"
)

type Server struct {
	Router    *gin.Engine
	auth      auth.Authenticator
	dataStore *datastore.DataStore
}

func NewServer(dataStore *datastore.DataStore, whiteList string) *Server {
	server := &Server{
		Router:    gin.Default(),
		dataStore: dataStore,
		auth:      auth.NewCacheAuth(whiteList),
	}
	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	api := s.Router.Group(constants.APIBasePath)
	{
		api.POST(constants.FlowsPath, s.flowsHandler)
	}
}

func (s *Server) flowsHandler(c *gin.Context) {
	kc := c.GetHeader(constants.KubeConfig)
	if kc == "" {
		c.JSON(http.StatusBadRequest, models.TrafficResponse{
			Message: constants.MissingKCMsg,
			Data:    nil,
		})
		return
	}
	kubeConfig, err := url.QueryUnescape(kc)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.TrafficResponse{
			Message: constants.DecodingKCFailedMsg,
			Data:    nil,
		})
		return
	}
	ns, err := s.auth.Authenticate(context.Background(), "", kubeConfig)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.TrafficResponse{
			Message: err.Error(),
			Data:    nil,
		})
		return
	}

	var req models.TrafficRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.TrafficResponse{
			Message: fmt.Sprintf(constants.InvalidRequestMsg, err.Error()),
			Data:    nil,
		})
		return
	}

	res := make([]models.TrafficData, 0, len(req.Resources))
	for _, resource := range req.Resources {
		flows, err := s.collectFlowData(ns, resource)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.TrafficResponse{
				Message: err.Error(),
				Data:    nil,
			})
			return
		}
		res = append(res, models.TrafficData{Resource: resource, Flows: flows})
	}

	c.JSON(http.StatusOK, models.TrafficResponse{
		Message: constants.GetFlowsSuccessMsg,
		Data:    res,
	})
}

func (s *Server) collectFlowData(namespace string, resource models.Resource) ([]string, error) {
	flowKey := fmt.Sprintf(constants.FlowSetKeyPattern, namespace, resource.Type, resource.Name)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	flows, err := s.dataStore.GetSetMembers(ctx, flowKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get outbound flows: %w", err)
	}
	return flows, nil
}
