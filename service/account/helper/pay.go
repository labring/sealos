package helper

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

type CreatePayReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Amount
	// @Description Amount
	// @JSONSchema required
	Amount int64 `json:"amount" bson:"amount" example:"100000000"`

	// @Summary Method
	// @Description Method
	// @JSONSchema required
	Method types.PaymentMethod `json:"method" bson:"method" example:"CARD"`

	*BindCardInfo `json:",inline" bson:",inline"`
}

type BindCardInfo struct {
	// @Summary CardID
	// @Description CardID
	CardID uuid.UUID `json:"cardID" bson:"cardID" example:"123e4567-e89b-12d3-a456-426614174000"`

	// @Summary CardNo
	// @Description CardNo
	CardNo string `json:"cardNo" bson:"cardNo" example:"1234567890"`

	// @Summary CardBrand
	// @Description CardBrand
	CardBrand string `json:"cardBrand" bson:"cardBrand" example:"VISA"`
}

type CreatePayResp struct {
	// @Summary RedirectURL
	// @Description RedirectURL
	RedirectURL string `json:"redirectUrl" bson:"redirectUrl" example:"https://www.example.com"`
}

func ParseCreatePayReq(c *gin.Context) (*CreatePayReq, error) {
	req := &CreatePayReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, err
	}
	return req, nil
}

type CardOperationReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	AuthBase `json:",inline" bson:",inline"`

	*BindCardInfo `json:",inline" bson:",inline"`
}

func ParseCardOperationReq(c *gin.Context) (*CardOperationReq, error) {
	req := &CardOperationReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, err
	}
	return req, nil
}

const (
	STRIPE  = "stripe"
	BALANCE = "balance"
)

type SubscriptionOperatorReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	AuthBase `json:",inline" bson:",inline"`

	// @Summary PlanName
	// @Description PlanName
	PlanName string `json:"planName" bson:"planName" example:"planName"`

	// @Summary PlanID
	// @Description PlanID
	PlanID uuid.UUID `json:"planID" bson:"planID" example:"123e4567-e89b-12d3-a456-426614174000"`

	// @Summary PayMethod
	// @Description PayMethod
	PayMethod types.PaymentMethod `json:"payMethod" bson:"payMethod" example:"CARD"`

	// @Summary CardID
	// @Description CardID
	CardID *uuid.UUID `json:"cardID" bson:"cardID" example:"123e4567-e89b-12d3-a456-426614174000"`

	// @Summary PlanType
	// @Description PlanType
	PlanType PlanType `json:"planType" bson:"planType" example:"upgrade;downgrade;renewal"`
}

type PlanType string

const (
	Upgrade   PlanType = "upgrade"
	Downgrade PlanType = "downgrade"
	Renewal   PlanType = "renewal"

	CARD types.PaymentMethod = "CARD"
)

func ParseSubscriptionOperatorReq(c *gin.Context) (*SubscriptionOperatorReq, error) {
	req := &SubscriptionOperatorReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, err
	}
	return req, nil
}

type SubscriptionQuotaCheckReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	AuthBase `json:",inline" bson:",inline"`

	// @Summary PlanID
	// @Description PlanID
	PlanID uuid.UUID `json:"planID" bson:"planID" example:"123e4567-e89b-12d3-a456-426614174000"`

	// @Summary PlanName
	// @Description PlanName
	PlanName string `json:"planName" bson:"planName" example:"planName"`
}

func ParseSubscriptionQuotaCheckReq(c *gin.Context) (*SubscriptionQuotaCheckReq, error) {
	req := &SubscriptionQuotaCheckReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, err
	}
	return req, nil
}

type SubscriptionQuotaCheckResp struct {
	// allWorkspaceReady
	AllWorkspaceReady bool `json:"allWorkspaceReady" bson:"allWorkspaceReady" example:"true"`

	ReadyWorkspace []string `json:"readyWorkspace" bson:"readyWorkspace" example:"workspace1,workspace2"`

	UnReadyWorkspace []string `json:"unReadyWorkspace" bson:"unReadyWorkspace" example:"workspace3,workspace4"`
}
