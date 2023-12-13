package api

import (
	"fmt"
	"net/http"

	"github.com/labring/sealos/service/account/common"

	"github.com/labring/sealos/service/account/dao"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/helper"
)

var _ = helper.NamespaceBillingHistoryReq{}

// @Summary Get namespace billing history list
// @Description Get the billing history namespace list from the database
// @Tags BillingHistory
// @Accept json
// @Produce json
// @Param request body helper.NamespaceBillingHistoryReq true "Namespace billing history request"
// @Success 200 {object} helper.NamespaceBillingHistoryRespData "successfully retrieved namespace billing history list"
// @Failure 400 {object} helper.ErrorMessage "failed to parse namespace billing history request"
// @Failure 401 {object} helper.ErrorMessage "authenticate error"
// @Failure 500 {object} helper.ErrorMessage "failed to get namespace billing history list"
// @Router /account/v1alpha1/namespaces [post]
func GetBillingHistoryNamespaceList(c *gin.Context) {
	// Parse the namespace billing history request
	req, err := helper.ParseNamespaceBillingHistoryReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse namespace billing history request: %v", err)})
		return
	}
	if err := helper.Authenticate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	// Get the billing history namespace list from the database
	nsList, err := dao.DBClient.GetBillingHistoryNamespaceList(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get namespace billing history list: %v", err)})
		return
	}
	c.JSON(http.StatusOK, helper.NamespaceBillingHistoryResp{
		Data: helper.NamespaceBillingHistoryRespData{
			List: nsList,
		},
		Message: "successfully retrieved namespace billing history list",
	})
}

// @Summary Get properties
// @Description Get properties from the database
// @Tags Properties
// @Accept json
// @Produce json
// @Param request body helper.Auth true "auth request"
// @Success 200 {object} helper.GetPropertiesResp "successfully retrieved properties"
// @Failure 401 {object} helper.ErrorMessage "authenticate error"
// @Failure 500 {object} helper.ErrorMessage "failed to get properties"
// @Router /account/v1alpha1/properties [post]
func GetProperties(c *gin.Context) {
	if err := helper.AuthenticateWithBind(c); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	// Get the properties from the database
	properties, err := dao.DBClient.GetProperties()
	if err != nil {
		c.JSON(http.StatusInternalServerError, fmt.Errorf(fmt.Sprintf("failed to get properties: %v", err)))
		return
	}
	c.JSON(http.StatusOK, helper.GetPropertiesResp{
		Data: helper.GetPropertiesRespData{
			Properties: properties,
		},
		Message: "successfully retrieved properties",
	})
}

type CostsResult struct {
	Data    CostsResultData `json:"data" bson:"data"`
	Message string          `json:"message" bson:"message"`
}

type CostsResultData struct {
	Costs common.TimeCostsMap `json:"costs" bson:"costs"`
}

// @Summary Get user costs
// @Description Get user costs within a specified time range
// @Tags Costs
// @Accept json
// @Produce json
// @Param request body helper.UserCostsAmountReq true "User costs amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user costs"
// @Failure 400 {object} map[string]interface{} "failed to parse user hour costs amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user costs"
// @Router /account/v1alpha1/costs [post]
func GetCosts(c *gin.Context) {
	req, err := helper.ParseUserCostsAmountReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user hour costs amount request: %v", err)})
		return
	}
	if err := helper.Authenticate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	costs, err := dao.DBClient.GetCostAmount(req.Auth.Owner, req.TimeRange.StartTime, req.TimeRange.EndTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get cost : %v", err)})
	}
	c.JSON(http.StatusOK, CostsResult{
		Data:    CostsResultData{Costs: costs},
		Message: "successfully retrieved user costs",
	})
}
