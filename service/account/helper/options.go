package helper

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

type NamespaceBillingHistoryReq struct {
	StartTime time.Time `json:"startTime" bson:"startTime"`
	EndTime   time.Time `json:"endTime" bson:"endTime"`
	Type      int       `json:"type" bson:"type"`
	Owner     string    `json:"owner" bson:"owner"`
}

type NamespaceBillingHistoryResp struct {
	NamespaceList []string `json:"namespaceList,omitempty"`
}

func ParseNamespaceBillingHistoryRequest(c *gin.Context) (*NamespaceBillingHistoryReq, error) {
	nsList := &NamespaceBillingHistoryReq{}
	err := c.ShouldBindJSON(nsList)
	if err != nil {
		return nil, fmt.Errorf("bind json error : %v", err)
	}
	return nsList, nil
}
