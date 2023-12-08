package helper

import (
	"fmt"
	"time"

	"github.com/dustin/go-humanize"

	"github.com/gin-gonic/gin"
)

type NamespaceBillingHistoryReq struct {
	Time `json:",inline" bson:",inline"`
	Type int `json:"type" bson:"type"`
	Auth `json:",inline" bson:",inline"`
}

type Time struct {
	StartTime time.Time `json:"startTime" bson:"startTime"`
	EndTime   time.Time `json:"endTime" bson:"endTime"`
}

type Auth struct {
	Owner      string `json:"owner" bson:"owner"`
	KubeConfig string `json:"kubeConfig" bson:"kubeConfig"`
}

type NamespaceBillingHistoryResp struct {
	NamespaceList []string `json:"namespaceList,omitempty"`
	Auth          `json:",inline" bson:",inline"`
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
	Time `json:",inline" bson:",inline"`
	Auth `json:",inline" bson:",inline"`
}

func ParseUserCostsAmountReq(c *gin.Context) (*UserCostsAmountReq, error) {
	userCosts := &UserCostsAmountReq{}
	if err := c.ShouldBindJSON(userCosts); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if userCosts.StartTime.Before(time.Now().Add(-6 * humanize.Month)) {
		userCosts.StartTime = time.Now().Add(-6 * humanize.Month)
	}
	if userCosts.EndTime.After(time.Now()) {
		userCosts.EndTime = time.Now()
	}
	return userCosts, nil
}
