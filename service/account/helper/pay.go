package helper

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
	Method string `json:"method" bson:"method" example:"CARD"`

	*BindCardInfo `json:",inline" bson:",inline"`
}

type BindCardInfo struct {
	CardUID uuid.UUID `json:"cardUID" bson:"cardUID" example:"123e4567-e89b-12d3-a456-426614174000"`

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

	// @Summary CardID
	// @Description CardID
	CardID uuid.UUID `json:"cardID" bson:"cardID" example:"123e4567-e89b-12d3-a456-426614174000"`
}

func ParseCardOperationReq(c *gin.Context) (*CardOperationReq, error) {
	req := &CardOperationReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, err
	}
	return req, nil
}
