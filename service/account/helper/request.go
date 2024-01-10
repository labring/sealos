package helper

import (
	"fmt"
	"strings"
	"time"

	"github.com/labring/sealos/service/account/common"

	"github.com/dustin/go-humanize"

	"github.com/gin-gonic/gin"
)

type NamespaceBillingHistoryReq struct {
	// @Summary Start and end time for the request
	// @Description Start and end time for the request
	// @JSONSchema required
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	Auth `json:",inline" bson:",inline"`

	// @Summary Type of the request (optional)
	// @Description Type of the request (optional)
	// @JSONSchema
	Type int `json:"type" bson:"type"`
}

type NamespaceBillingHistoryResp struct {
	Data    NamespaceBillingHistoryRespData `json:"data,omitempty" bson:"data,omitempty"`
	Message string                          `json:"message,omitempty" bson:"message" example:"successfully retrieved namespace list"`
}

type NamespaceBillingHistoryRespData struct {
	List []string `json:"list,omitempty" bson:"list,omitempty" example:"[\"ns-admin\",\"ns-test1\"]"`
}

type GetPropertiesResp struct {
	Data    GetPropertiesRespData `json:"data,omitempty" bson:"data,omitempty"`
	Message string                `json:"message,omitempty" bson:"message" example:"successfully retrieved properties"`
}

type GetPropertiesRespData struct {
	Properties []common.PropertyQuery `json:"properties,omitempty" bson:"properties,omitempty"`
}

type ErrorMessage struct {
	Error string `json:"error,omitempty" bson:"error,omitempty" example:"authentication failure"`
}

type TimeRange struct {
	StartTime time.Time `json:"startTime" bson:"startTime" example:"2021-01-01T00:00:00Z"`
	EndTime   time.Time `json:"endTime" bson:"endTime" example:"2021-12-01T00:00:00Z"`
}

type Auth struct {
	Owner      string `json:"owner" bson:"owner" binding:"required" example:"admin"`
	KubeConfig string `json:"kubeConfig" bson:"kubeConfig" binding:"required"`
}

func ParseNamespaceBillingHistoryReq(c *gin.Context) (*NamespaceBillingHistoryReq, error) {
	nsList := &NamespaceBillingHistoryReq{}
	err := c.ShouldBindJSON(nsList)
	if err != nil {
		return nil, fmt.Errorf("bind json error : %v", err)
	}
	return nsList, nil
}

type UserCostsAmountReq struct {
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	Auth `json:",inline" bson:",inline"`
}

func ParseUserCostsAmountReq(c *gin.Context) (*UserCostsAmountReq, error) {
	userCosts := &UserCostsAmountReq{}
	if err := c.ShouldBindJSON(userCosts); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if userCosts.TimeRange.StartTime.Before(time.Now().Add(-6 * humanize.Month)) {
		userCosts.TimeRange.StartTime = time.Now().Add(-6 * humanize.Month)
	}
	if userCosts.TimeRange.EndTime.After(time.Now()) {
		userCosts.TimeRange.EndTime = time.Now()
	}
	userCosts.Owner = strings.TrimPrefix(userCosts.Owner, "ns-")
	return userCosts, nil
}
