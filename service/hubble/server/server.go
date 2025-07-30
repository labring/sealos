package server

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/labring/sealos/service/hubble/datastore"
	"github.com/labring/sealos/service/hubble/pkg/auth"
	"github.com/labring/sealos/service/hubble/pkg/constants"
	"github.com/labring/sealos/service/hubble/pkg/models"

	"github.com/gin-gonic/gin"
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
		c.JSON(http.StatusBadRequest, models.Response{
			Message: constants.MissingKCMsg,
			Data:    nil,
		})
		return
	}
	kubeConfig, err := url.QueryUnescape(kc)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.Response{
			Message: constants.DecodingKCFailedMsg,
			Data:    nil,
		})
		return
	}
	ns, err := s.auth.Authenticate(context.Background(), "", kubeConfig)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.Response{
			Message: err.Error(),
			Data:    nil,
		})
		return
	}

	var req models.FlowsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.Response{
			Message: fmt.Sprintf(constants.InvalidRequestMsg, err.Error()),
			Data:    nil,
		})
		return
	}

	var res []models.FlowsData
	for _, crName := range req.CRNames {
		flows, err := s.collectFlowData(ns, crName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Message: err.Error(),
				Data:    nil,
			})
			return
		}
		res = append(res, models.FlowsData{CRName: crName, Flows: flows})
	}

	c.JSON(http.StatusOK, models.Response{
		Message: constants.GetFlowsSuccessMsg,
		Data:    res,
	})
}

func (s *Server) collectFlowData(namespace, crName string) ([]string, error) {
	flowKey := fmt.Sprintf(constants.CRFlowSetKeyPattern, namespace, crName)
	flows, err := s.dataStore.GetSetMembers(flowKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get outbound flows: %w", err)
	}
	return flows, nil
}
