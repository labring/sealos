package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// @Summary Get credits info
// @Description Get credits info
// @Tags Credits
// @Accept json
// @Produce json
// @Param req body CreditsInfoReq true "CreditsInfoReq"
// @Success 200 {object} CreditsInfoResp
// @Router /account/v1alpha1/credits/info [post]
func GetCreditsInfo(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	credits, err := dao.DBClient.GetBalanceWithCredits(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get credits info: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"credits": credits,
	})
}
