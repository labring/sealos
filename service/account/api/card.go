package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// @Summary List user card info
// @Description List user card info
// @Tags Payment
// @Accept json
// @Produce json
// @Param req body CardListReq true "CardListReq"
// @Success 200 {object} CardListResp
// @Router /payment/v1alpha1/card/list [post]
func ListCard(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	cards, err := dao.DBClient.GetCardList(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get card list: %v", err)})
		return
	}
	type cardInfo struct {
		ID                uuid.UUID
		UserUID           uuid.UUID
		CardNo            string
		CardBrand         string
		CreatedAt         time.Time
		Default           bool
		LastPaymentStatus types.PaymentOrderStatus
	}

	var _cards []cardInfo
	for i := range cards {
		_cards = append(_cards, cardInfo{
			ID:                cards[i].ID,
			UserUID:           cards[i].UserUID,
			CardNo:            cards[i].CardNo,
			CardBrand:         cards[i].CardBrand,
			CreatedAt:         cards[i].CreatedAt,
			Default:           cards[i].Default,
			LastPaymentStatus: cards[i].LastPaymentStatus,
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"cards": _cards,
	})
}

// @Summary Delete user card info
// @Description Delete user card info
// @Tags Payment
// @Accept json
// @Produce json
// @Param req body CardDeleteReq true "CardDeleteReq"
// @Success 200 {object} CardDeleteResp
// @Router /payment/v1alpha1/card/delete [post]
func DeleteCard(c *gin.Context) {
	req, err := helper.ParseCardOperationReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprint("failed to parse request: ", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	if req.CardID == uuid.Nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty card id"})
		return
	}
	if err := dao.DBClient.DeleteCardInfo(req.CardID, req.UserUID); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to delete card: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"card_id": req.CardID,
		"data":    "success",
	})
}

// @Summary Set default user card
// @Description Set default user card
// @Tags Payment
// @Accept json
// @Produce json
// @Param req body CardOperationReq true "CardOperationReq"
// @Success 200 {object} CardOperationResp
// @Router /payment/v1alpha1/card/set-default [post]
func SetDefaultCard(c *gin.Context) {
	req, err := helper.ParseCardOperationReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprint("failed to parse request: ", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	if req.CardID == uuid.Nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty card id"})
		return
	}
	if err := dao.DBClient.SetDefaultCard(req.CardID, req.UserUID); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to set default card: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"card_id": req.CardID,
		"data":    "success",
	})
}
