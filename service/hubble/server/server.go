package server

import (
	"context"
	"fmt"
	"hubble/datastore"
	"hubble/pkg/auth"
	"hubble/pkg/constants"
	"hubble/pkg/models"
	"net/http"
	"time"

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
		api.POST(constants.DiscoveryPath, s.getFlowConnections)
	}
}

func (s *Server) getFlowConnections(c *gin.Context) {
	kc := c.GetHeader(constants.KubeConfig)
	if kc == "" {
		c.JSON(http.StatusBadRequest, models.Response{
			Message: constants.MissingKCMsg,
			Data:    nil,
		})
		return
	}

	ns, err := s.auth.Authenticate(context.Background(), "", kc)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.Response{
			Message: err.Error(),
			Data:    nil,
		})
		return
	}

	var req models.DiscoveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.Response{
			Message: fmt.Sprintf(constants.InvalidRequestMsg, err.Error()),
			Data:    nil,
		})
		return
	}

	var res []models.DiscoveryData
	for _, podName := range req.PodNames {
		flows, err := s.collectFlowData(ns, podName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Message: err.Error(),
				Data:    nil,
			})
			return
		}
		res = append(res, models.DiscoveryData{
			PodName: podName,
			Flows:   flows,
		})
	}

	c.JSON(http.StatusOK, models.Response{
		Message: constants.GetFlowsSuccessMsg,
		Data:    res,
	})
}

func (s *Server) collectFlowData(namespace, pod string) ([]models.Flow, error) {
	var allFlows []models.Flow
	outboundFlows, err := s.getOutboundFlows(namespace, pod)
	if err != nil {
		return nil, fmt.Errorf(constants.OutboundFlowErrorMsg, err)
	}
	allFlows = append(allFlows, outboundFlows...)
	inboundFlows, err := s.getInboundFlows(namespace, pod)
	if err != nil {
		return nil, fmt.Errorf(constants.InboundFlowErrorMsg, err)
	}
	allFlows = append(allFlows, inboundFlows...)

	return allFlows, nil
}

func (s *Server) parseFlow(fromPod, toPod, flowKey string) (models.Flow, bool) {
	flowData, exists, err := s.dataStore.Get(flowKey)
	if err != nil {
		return models.Flow{}, false
	}

	if !exists {
		return models.Flow{}, false
	}

	timestamp, err := time.Parse(time.RFC3339, flowData)
	if err != nil {
		timestamp = time.Now()
	}

	return models.Flow{
		From:      fromPod,
		To:        toPod,
		Timestamp: timestamp,
	}, true
}

func (s *Server) getOutboundFlows(namespace, pod string) ([]models.Flow, error) {
	var flows []models.Flow

	fromKey := fmt.Sprintf(constants.OutboundSetKeyPattern, namespace, pod)
	toPods, err := s.dataStore.GetSetMembers(fromKey)
	if err != nil {
		return nil, err
	}

	for _, toPod := range toPods {
		flowKey := fmt.Sprintf(constants.OutboundFlowKeyPattern, namespace, pod, toPod)

		if flow, success := s.parseFlow(pod, toPod, flowKey); success {
			flows = append(flows, flow)
		}
	}

	return flows, nil
}

func (s *Server) getInboundFlows(namespace, pod string) ([]models.Flow, error) {
	var flows []models.Flow

	toKey := fmt.Sprintf(constants.InboundSetKeyPattern, namespace, pod)
	fromPods, err := s.dataStore.GetSetMembers(toKey)
	if err != nil {
		return nil, err
	}

	for _, fromPod := range fromPods {
		flowKey := fmt.Sprintf(constants.InboundFlowKeyPattern, fromPod, namespace, pod)
		if flow, success := s.parseFlow(fromPod, pod, flowKey); success {
			flows = append(flows, flow)
		}
	}

	return flows, nil
}
