package controller

import (
	"fmt"
	"maps"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/monitor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	log "github.com/sirupsen/logrus"
)

func ChannelTypeNames(c *gin.Context) {
	middleware.SuccessResponse(c, channeltype.ChannelNames)
}

func ChannelTypeMetas(c *gin.Context) {
	middleware.SuccessResponse(c, channeltype.ChannelMetas)
}

func GetChannels(c *gin.Context) {
	page, perPage := parsePageParams(c)
	id, _ := strconv.Atoi(c.Query("id"))
	name := c.Query("name")
	key := c.Query("key")
	channelType, _ := strconv.Atoi(c.Query("channel_type"))
	baseURL := c.Query("base_url")
	order := c.Query("order")
	channels, total, err := model.GetChannels(page*perPage, perPage, id, name, key, channelType, baseURL, order)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"channels": channels,
		"total":    total,
	})
}

func GetAllChannels(c *gin.Context) {
	channels, err := model.GetAllChannels()
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, channels)
}

func AddChannels(c *gin.Context) {
	channels := make([]*AddChannelRequest, 0)
	err := c.ShouldBindJSON(&channels)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	_channels := make([]*model.Channel, 0, len(channels))
	for _, channel := range channels {
		channels, err := channel.ToChannels()
		if err != nil {
			middleware.ErrorResponse(c, http.StatusOK, err.Error())
			return
		}
		_channels = append(_channels, channels...)
	}
	err = model.BatchInsertChannels(_channels)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func SearchChannels(c *gin.Context) {
	keyword := c.Query("keyword")
	page, perPage := parsePageParams(c)
	id, _ := strconv.Atoi(c.Query("id"))
	name := c.Query("name")
	key := c.Query("key")
	channelType, _ := strconv.Atoi(c.Query("channel_type"))
	baseURL := c.Query("base_url")
	order := c.Query("order")
	channels, total, err := model.SearchChannels(keyword, page*perPage, perPage, id, name, key, channelType, baseURL, order)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"channels": channels,
		"total":    total,
	})
}

func GetChannel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	channel, err := model.GetChannelByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, channel)
}

type AddChannelRequest struct {
	ModelMapping map[string]string    `json:"model_mapping"`
	Config       *model.ChannelConfig `json:"config"`
	Name         string               `json:"name"`
	Key          string               `json:"key"`
	BaseURL      string               `json:"base_url"`
	Other        string               `json:"other"`
	Models       []string             `json:"models"`
	Type         int                  `json:"type"`
	Priority     int32                `json:"priority"`
	Status       int                  `json:"status"`
}

func (r *AddChannelRequest) ToChannel() (*model.Channel, error) {
	channelType, ok := channeltype.GetAdaptor(r.Type)
	if !ok {
		return nil, fmt.Errorf("invalid channel type: %d", r.Type)
	}
	if validator, ok := channelType.(adaptor.KeyValidator); ok {
		err := validator.ValidateKey(r.Key)
		if err != nil {
			keyHelp := validator.KeyHelp()
			if keyHelp == "" {
				return nil, fmt.Errorf("%s [%s(%d)] invalid key: %w", r.Name, channeltype.ChannelNames[r.Type], r.Type, err)
			}
			return nil, fmt.Errorf("%s [%s(%d)] invalid key: %w, %s", r.Name, channeltype.ChannelNames[r.Type], r.Type, err, keyHelp)
		}
	}
	return &model.Channel{
		Type:         r.Type,
		Name:         r.Name,
		Key:          r.Key,
		BaseURL:      r.BaseURL,
		Models:       slices.Clone(r.Models),
		ModelMapping: maps.Clone(r.ModelMapping),
		Priority:     r.Priority,
		Status:       r.Status,
		Config:       r.Config,
	}, nil
}

func (r *AddChannelRequest) ToChannels() ([]*model.Channel, error) {
	keys := strings.Split(r.Key, "\n")
	channels := make([]*model.Channel, 0, len(keys))
	for _, key := range keys {
		if key == "" {
			continue
		}
		c, err := r.ToChannel()
		if err != nil {
			return nil, err
		}
		c.Key = key
		channels = append(channels, c)
	}
	if len(channels) == 0 {
		ch, err := r.ToChannel()
		if err != nil {
			return nil, err
		}
		return []*model.Channel{ch}, nil
	}
	return channels, nil
}

func AddChannel(c *gin.Context) {
	channel := AddChannelRequest{}
	err := c.ShouldBindJSON(&channel)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	channels, err := channel.ToChannels()
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.BatchInsertChannels(channels)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteChannel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	err := model.DeleteChannelByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteChannels(c *gin.Context) {
	ids := []int{}
	err := c.ShouldBindJSON(&ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.DeleteChannelsByIDs(ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func UpdateChannel(c *gin.Context) {
	idStr := c.Param("id")
	if idStr == "" {
		middleware.ErrorResponse(c, http.StatusOK, "id is required")
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	channel := AddChannelRequest{}
	err = c.ShouldBindJSON(&channel)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	ch, err := channel.ToChannel()
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	ch.ID = id
	err = model.UpdateChannel(ch)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = monitor.ClearChannelAllModelErrors(c.Request.Context(), id)
	if err != nil {
		log.Errorf("failed to clear channel all model errors: %+v", err)
	}
	middleware.SuccessResponse(c, ch)
}

type UpdateChannelStatusRequest struct {
	Status int `json:"status"`
}

func UpdateChannelStatus(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	status := UpdateChannelStatusRequest{}
	err := c.ShouldBindJSON(&status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.UpdateChannelStatusByID(id, status.Status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = monitor.ClearChannelAllModelErrors(c.Request.Context(), id)
	if err != nil {
		log.Errorf("failed to clear channel all model errors: %+v", err)
	}
	middleware.SuccessResponse(c, nil)
}
