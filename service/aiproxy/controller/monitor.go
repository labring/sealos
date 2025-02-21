package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/monitor"
)

func GetAllChannelModelErrorRates(c *gin.Context) {
	rates, err := monitor.GetAllChannelModelErrorRates(c.Request.Context())
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	c.JSON(http.StatusOK, rates)
}

func GetChannelModelErrorRates(c *gin.Context) {
	channelID := c.Param("id")
	channelIDInt, err := strconv.ParseInt(channelID, 10, 64)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "Invalid channel ID")
		return
	}
	rates, err := monitor.GetChannelModelErrorRates(c.Request.Context(), channelIDInt)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	c.JSON(http.StatusOK, rates)
}

func ClearAllModelErrors(c *gin.Context) {
	err := monitor.ClearAllModelErrors(c.Request.Context())
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}

func ClearChannelAllModelErrors(c *gin.Context) {
	channelID := c.Param("id")
	channelIDInt, err := strconv.ParseInt(channelID, 10, 64)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "Invalid channel ID")
		return
	}
	err = monitor.ClearChannelAllModelErrors(c.Request.Context(), int(channelIDInt))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}

func ClearChannelModelErrors(c *gin.Context) {
	channelID := c.Param("id")
	model := c.Param("model")
	channelIDInt, err := strconv.ParseInt(channelID, 10, 64)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "Invalid channel ID")
		return
	}
	err = monitor.ClearChannelModelErrors(c.Request.Context(), model, int(channelIDInt))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	c.Status(http.StatusNoContent)
}

func GetModelsErrorRate(c *gin.Context) {
	rates, err := monitor.GetModelsErrorRate(c.Request.Context())
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	c.JSON(http.StatusOK, rates)
}
