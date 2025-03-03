package api

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"

	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/resources"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	"github.com/labring/sealos/controllers/pkg/types"

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
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	// Get the billing history namespace list from the database
	nsList, err := dao.DBClient.GetBillingHistoryNamespaceList(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get namespace billing history list: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": nsList,
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
	// Get the properties from the database
	properties, err := dao.DBClient.GetProperties()
	if err != nil {
		c.JSON(http.StatusInternalServerError, fmt.Errorf("failed to get properties: %v", err))
		return
	}
	c.JSON(http.StatusOK, helper.GetPropertiesResp{
		Data: helper.GetPropertiesRespData{
			Properties: properties,
		},
		Message: "successfully retrieved properties",
	})
}

// GetConsumptionAmount
// @Summary Get user consumption amount
// @Description Get user consumption amount within a specified time range
// @Tags ConsumptionAmount
// @Accept json
// @Produce json
// @Param request body helper.ConsumptionRecordReq true "User consumption amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user consumption amount"
// @Failure 400 {object} map[string]interface{} "failed to parse user consumption amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user consumption amount"
// @Router /account/v1alpha1/costs/consumption [post]
func GetConsumptionAmount(c *gin.Context) {
	req, err := helper.ParseConsumptionRecordReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user consumption amount request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	amount, err := dao.DBClient.GetConsumptionAmount(*req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get consumption amount : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"amount": amount,
	})
}

// GetAllRegionConsumptionAmount
// @Summary Get all region consumption amount
// @Description Get all region consumption amount within a specified time range
// @Tags ConsumptionAmount
// @Accept json
// @Produce json
// @Param request body helper.ConsumptionRecordReq true "All region consumption amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved all region consumption amount"
// @Failure 400 {object} map[string]interface{} "failed to parse all region consumption amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get all region consumption amount"
// @Router /account/v1alpha1/costs/all-region-consumption [post]
func GetAllRegionConsumptionAmount(c *gin.Context) {
	req, err := helper.ParseConsumptionRecordReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse all region consumption amount request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	regionAmount := make(map[string]int64)
	allAmount := int64(0)
	for _, region := range dao.Cfg.Regions {
		if region.Domain == dao.Cfg.LocalRegionDomain {
			amount, err := dao.DBClient.GetConsumptionAmount(*req)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get consumption amount : %v", err)})
				return
			}
			regionAmount[region.Domain] = amount
			allAmount += amount
			continue
		}
		svc := region.AccountSvc
		url := fmt.Sprintf("https://%s%s%s", svc, helper.GROUP, helper.GetConsumptionAmount)
		body, err := json.Marshal(&helper.ConsumptionRecordReq{
			TimeRange: req.TimeRange,
			AppType:   req.AppType,
			Namespace: req.Namespace,
			AppName:   req.AppName,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to marshal request: %v", err)})
			return
		}
		tr := &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: os.Getenv("INSECURE_VERIFY") != "true", MinVersion: tls.VersionTLS13},
		}
		client := &http.Client{Transport: tr}
		req2, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create request: %v", err)})
			return
		}
		token, err := dao.JwtMgr.GenerateToken(helper.JwtUser{
			UserID: req.GetAuth().UserID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate token: %v", err)})
			return
		}
		req2.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		req2.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req2)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to send request: %v", err)})
			return
		}
		defer resp.Body.Close()
		body, err = io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to read response body: %v", err)})
			return
		}
		var respData map[string]interface{}
		err = json.Unmarshal(body, &respData)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to unmarshal response body: %v", err)})
			return
		}
		if resp.StatusCode != http.StatusOK {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get response, status code: %d, msg: %s", resp.StatusCode, respData["error"])})
			return
		}
		amountResp, ok := respData["amount"].(float64)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("amount is not an integer, is %T", respData["amount"])})
			return
		}
		regionAmount[region.Domain] = int64(amountResp)
		allAmount += int64(amountResp)
	}
	c.JSON(http.StatusOK, gin.H{
		"regionAmount": regionAmount,
		"allAmount":    allAmount,
	})
}

// GetPayment
// @Summary Get user payment
// @Description Get user payment within a specified time range
// @Tags Payment
// @Accept json
// @Produce json
// @Param request body helper.GetPaymentReq true "User payment request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user payment"
// @Failure 400 {object} map[string]interface{} "failed to parse user payment request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user payment"
// @Router /account/v1alpha1/costs/payment [post]
func GetPayment(c *gin.Context) {
	req, err := helper.ParsePaymentReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user payment request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	payment, limitResp, err := dao.DBClient.GetPayment(&types.UserQueryOpts{ID: req.Auth.UserID}, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get payment : %v", err)})
		return
	}
	type PaymentResp struct {
		Payment         []types.Payment `json:"payments"`
		types.LimitResp `json:",inline" bson:",inline"`
	}
	c.JSON(http.StatusOK, gin.H{
		"data": PaymentResp{
			Payment:   payment,
			LimitResp: limitResp,
		},
	})
}

// GetRechargeAmount
// @Summary Get user recharge amount
// @Description Get user recharge amount within a specified time range
// @Tags RechargeAmount
// @Accept json
// @Produce json
// @Param request body helper.UserTimeRangeReq true "User recharge amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user recharge amount"
// @Failure 400 {object} map[string]interface{} "failed to parse user recharge amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user recharge amount"
// @Router /account/v1alpha1/costs/recharge [post]
func GetRechargeAmount(c *gin.Context) {
	req, err := helper.ParseUserTimeRangeReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user recharge amount request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	amount, err := dao.DBClient.GetRechargeAmount(types.UserQueryOpts{ID: req.Auth.UserID}, req.TimeRange.StartTime, req.TimeRange.EndTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get recharge amount : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"amount": amount,
	})
}

// GetPropertiesUsedAmount
// @Summary Get user properties used amount
// @Description Get user properties used amount within a specified time range
// @Tags PropertiesUsedAmount
// @Accept json
// @Produce json
// @Param request body helper.UserTimeRangeReq true "User properties used amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user properties used amount"
// @Failure 400 {object} map[string]interface{} "failed to parse user properties used amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user properties used amount"
// @Router /account/v1alpha1/costs/properties [post]
func GetPropertiesUsedAmount(c *gin.Context) {
	req, err := helper.ParseUserTimeRangeReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user properties used amount request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	amount, err := dao.DBClient.GetPropertiesUsedAmount(req.Auth.Owner, req.TimeRange.StartTime, req.TimeRange.EndTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get properties used amount : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"amount": amount,
	})
}

type CostsResult struct {
	Data    CostsResultData `json:"data" bson:"data"`
	Message string          `json:"message" bson:"message"`
}

type CostsResultData struct {
	Costs common.TimeCostsMap `json:"costs" bson:"costs"`
}

// GetCosts
// @Summary Get user costs
// @Description Get user costs within a specified time range
// @Tags Costs
// @Accept json
// @Produce json
// @Param request body helper.ConsumptionRecordReq true "User costs amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user costs"
// @Failure 400 {object} map[string]interface{} "failed to parse user hour costs amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user costs"
// @Router /account/v1alpha1/costs [post]
func GetCosts(c *gin.Context) {
	req, err := helper.ParseConsumptionRecordReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user hour costs amount request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	costs, err := dao.DBClient.GetCosts(*req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get cost : %v", err)})
		return
	}
	c.JSON(http.StatusOK, CostsResult{
		Data:    CostsResultData{Costs: costs},
		Message: "successfully retrieved user costs",
	})
}

// GetAccount
// @Summary Get user account
// @Description Get user account
// @Tags Account
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully retrieved user account"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user account"
// @Router /account/v1alpha1/account [post]
func GetAccount(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	account, err := dao.DBClient.GetAccount(types.UserQueryOpts{ID: req.Auth.UserID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get account : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"account": account,
	})
}

// SetPaymentInvoice
// TODO will be deprecated
// @Summary Set payment invoice
// @Description Set payment invoice
// @Tags PaymentInvoice
// @Accept json
// @Produce json
// @Param request body helper.SetPaymentInvoiceReq true "Set payment invoice request"
// @Success 200 {object} map[string]interface{} "successfully set payment invoice"
// @Failure 400 {object} map[string]interface{} "failed to parse set payment invoice request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to set payment invoice"
// @Router /account/v1alpha1/payment/set-invoice [post]
func SetPaymentInvoice(c *gin.Context) {
	req, err := helper.ParseSetPaymentInvoiceReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse set payment invoice request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	if err := dao.DBClient.SetPaymentInvoice(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to set payment invoice : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "successfully set payment invoice",
	})
}

// TransferAmount
// @Summary Transfer amount
// @Description Transfer amount
// @Tags TransferAmount
// @Accept json
// @Produce json
// @Param request body helper.TransferAmountReq true "Transfer amount request"
// @Success 200 {object} map[string]interface{} "successfully transfer amount"
// @Failure 400 {object} map[string]interface{} "failed to parse transfer amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to transfer amount"
// @Router /account/v1alpha1/transfer [post]
func TransferAmount(c *gin.Context) {
	req, err := helper.ParseTransferAmountReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse transfer amount request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	if err := dao.DBClient.Transfer(req); err != nil {
		if err == cockroach.ErrInsufficientBalance {
			c.JSON(http.StatusOK, gin.H{
				"message": "insufficient balance, skip transfer",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to transfer amount : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "successfully transfer amount",
	})
}

// GetTransfer
// @Summary Get transfer
// @Description Get transfer
// @Tags Transfer
// @Accept json
// @Produce json
// @Param request body helper.GetTransferRecordReq true "Get transfer request"
// @Success 200 {object} map[string]interface{} "successfully get transfer"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get transfer"
// @Router /account/v1alpha1/get-transfer [post]
func GetTransfer(c *gin.Context) {
	req, err := helper.ParseGetTransferRecordReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse get transfer amount request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	ops := types.GetTransfersReq{
		UserQueryOpts: &types.UserQueryOpts{ID: req.Auth.UserID},
		Type:          types.TransferType(req.Type),
		LimitReq: types.LimitReq{
			Page:     req.Page,
			PageSize: req.PageSize,
			TimeRange: types.TimeRange{
				StartTime: req.TimeRange.StartTime,
				EndTime:   req.TimeRange.EndTime,
			},
		},
		TransferID: req.TransferID,
	}
	transferResp, err := dao.DBClient.GetTransfer(&ops)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get transfer amount : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": transferResp,
	})
}

// GetAPPCosts
// @Summary Get app costs
// @Description Get app costs within a specified time range
// @Tags AppCosts
// @Accept json
// @Produce json
// @Param request body helper.AppCostsReq true "App costs request"
// @Success 200 {object} map[string]interface{} "successfully retrieved app costs"
// @Failure 400 {object} map[string]interface{} "failed to parse get app cost request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get app cost"
// @Router /account/v1alpha1/costs/app [post]
func GetAPPCosts(c *gin.Context) {
	req, err := helper.ParseAppCostsReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse get app cost request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	cost, err := dao.DBClient.GetAppCosts(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get app cost : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"app_costs": cost,
	})
}

// CheckPermission
// @Summary Check permission
// @Description Check permission
// @Tags Permission
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully check permission"
// @Failure 400 {object} map[string]interface{} "failed to parse check permission request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to check permission"
// @Router /account/v1alpha1/check-permission [post]
func CheckPermission(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"userID":  req.Auth.UserID,
		"message": "successfully check permission",
	})
}

// GetRegions
// @Summary Get regions
// @Description Get regions
// @Tags Regions
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully get regions"
// @Failure 500 {object} map[string]interface{} "failed to get regions"
// @Router /account/v1alpha1/regions [post]
func GetRegions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"regions": dao.Cfg.Regions,
	})
}

// GetCostOverview
// @Summary Get cost overview
// @Description Get cost overview
// @Tags CostOverview
// @Accept json
// @Produce json
// @Param request body helper.GetCostAppListReq true "Cost overview request"
// @Success 200 {object} helper.CostOverviewResp "successfully get cost overview"
// @Failure 400 {object} map[string]interface{} "failed to parse cost overview request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get cost overview"
// @Router /account/v1alpha1/cost-overview [post]
func GetCostOverview(c *gin.Context) {
	req, err := helper.ParseGetCostAppListReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse cost overview request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	overview, err := dao.DBClient.GetCostOverview(*req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get cost overview : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": overview,
	})
}

// GetCostAppList
// @Summary Get cost app list
// @Description Get cost app list
// @Tags CostAppList
// @Accept json
// @Produce json
// @Param request body helper.GetCostAppListReq true "Cost app list request"
// @Success 200 {object} helper.CostAppListResp "successfully get cost app list"
// @Failure 400 {object} map[string]interface{} "failed to parse cost app list request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get cost app list"
// @Router /account/v1alpha1/cost-app-list [post]
func GetCostAppList(c *gin.Context) {
	req, err := helper.ParseGetCostAppListReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse cost app list request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	apps, err := dao.DBClient.GetCostAppList(*req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get cost app list : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": apps,
	})
}

// GetAppTypeList
// @Summary Get app type list
// @Description Get app type list
// @Tags AppTypeList
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully get app type list"
// @Failure 500 {object} map[string]interface{} "failed to get app type list"
// @Router /account/v1alpha1/cost-app-type-list [post]
func GetAppTypeList(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"data": resources.AppTypeReverse,
	})
}

// GetBasicCostDistribution
// @Summary Get basic cost distribution
// @Description Get basic cost distribution
// @Tags BasicCostDistribution
// @Accept json
// @Produce json
// @Param request body helper.GetCostAppListReq true "Basic cost distribution request"
// @Success 200 {object} map[string]interface{} "successfully get basic cost distribution"
// @Failure 400 {object} map[string]interface{} "failed to parse basic cost distribution request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get basic cost distribution"
// @Router /account/v1alpha1/cost-basic-distribution [post]
func GetBasicCostDistribution(c *gin.Context) {
	req, err := helper.ParseGetCostAppListReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse basic cost distribution request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	costs, err := dao.DBClient.GetBasicCostDistribution(*req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get basic cost distribution : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": costs,
	})
}

// GetAppCostTimeRange
// @Summary Get app cost time range
// @Description Get app cost time range
// @Tags AppCostTimeRange
// @Accept json
// @Produce json
// @Param request body helper.GetCostAppListReq true "App cost time range request"
// @Success 200 {object} map[string]interface{} "successfully get app cost time range"
// @Failure 400 {object} map[string]interface{} "failed to parse app cost time range request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get app cost time range"
// @Router /account/v1alpha1/cost-app-time-range [post]
func GetAppCostTimeRange(c *gin.Context) {
	req, err := helper.ParseGetCostAppListReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse app cost time range request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	timeRange, err := dao.DBClient.GetAppCostTimeRange(*req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get app cost time range : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": timeRange,
	})
}

func ParseAuthTokenUser(c *gin.Context) (auth *helper.Auth, err error) {
	user, err := dao.JwtMgr.ParseUser(c)
	if err != nil {
		return nil, fmt.Errorf("failed to parse user: %v", err)
	}
	if user.UserID == "" {
		return nil, fmt.Errorf("invalid user: %v", user)
	}
	auth = &helper.Auth{
		Owner:   user.UserCrName,
		UserID:  user.UserID,
		UserUID: user.UserUID,
	}
	// if the user is not in the local region, get the user cr name from db
	if dao.DBClient.GetLocalRegion().UID.String() != user.RegionUID {
		auth.Owner, err = dao.DBClient.GetUserCrName(types.UserQueryOpts{ID: user.UserID})
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				fmt.Printf("failed to get user cr name: %v\n", err)
				return auth, nil
			}
		}
	}
	return
}

func checkInvoiceToken(token string) error {
	if token != dao.Cfg.InvoiceToken || token == "" {
		return fmt.Errorf("invalid invoice token: %s", token)
	}
	return nil
}

// ApplyInvoice
// @Summary Apply invoice
// @Description Apply invoice
// @Tags ApplyInvoice
// @Accept json
// @Produce json
// @Param request body helper.ApplyInvoiceReq true "Apply invoice request"
// @Success 200 {object} map[string]interface{} "successfully apply invoice"
// @Failure 400 {object} map[string]interface{} "failed to parse apply invoice request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 403 {object} map[string]interface{} "no payment can be applied to the invoice"
// @Failure 500 {object} map[string]interface{} "failed to apply invoice"
// @Router /account/v1alpha1/invoice/apply [post]
func ApplyInvoice(c *gin.Context) {
	req, err := helper.ParseApplyInvoiceReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse apply invoice request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	invoice, payments, err := dao.DBClient.ApplyInvoice(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to apply invoice : %v", err)})
		return
	}
	if len(payments) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "no payment can be applied to the invoice"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":    map[string]interface{}{"invoice": invoice, "payments": payments},
		"message": "successfully apply invoice",
	})
}

// GetInvoice
// @Summary Get invoice
// @Description Get invoice
// @Tags GetInvoice
// @Accept json
// @Produce json
// @Param request body helper.GetInvoiceReq true "Get invoice request"
// @Success 200 {object} map[string]interface{} "successfully get invoice"
// @Failure 400 {object} map[string]interface{} "failed to parse get invoice request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get invoice"
// @Router /account/v1alpha1/invoice/get [post]
func GetInvoice(c *gin.Context) {
	req, err := helper.ParseGetInvoiceReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse get invoice request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	invoices, limits, err := dao.DBClient.GetInvoice(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get invoice : %v", err)})
		return
	}
	type resp struct {
		Invoices        []types.Invoice `json:"invoices"`
		types.LimitResp `json:",inline" bson:",inline"`
	}
	c.JSON(http.StatusOK, gin.H{
		"data": resp{
			Invoices:  invoices,
			LimitResp: limits,
		},
	})
}

func authenticateRequest(c *gin.Context, req helper.AuthReq) error {
	if req.GetAuth() != nil && req.GetAuth().Token != "" {
		return checkInvoiceToken(req.GetAuth().Token)
	}
	auth, err := ParseAuthTokenUser(c)
	req.SetAuth(auth)
	return err
}

// SetStatusInvoice
// @Summary Set status invoice
// @Description Set status invoice
// @Tags SetStatusInvoice
// @Accept json
// @Produce json
// @Param request body helper.SetInvoiceStatusReq true "Set status invoice request"
// @Success 200 {object} map[string]interface{} "successfully set status invoice"
// @Failure 400 {object} map[string]interface{} "failed to parse set status invoice request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to set status invoice"
// @Router /account/v1alpha1/invoice/set-status [post]
func SetStatusInvoice(c *gin.Context) {
	req, err := helper.ParseSetInvoiceStatusReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse set status invoice request: %v", err)})
		return
	}
	auth := req.GetAuth()
	if auth != nil {
		err = checkInvoiceToken(auth.Token)
	} else {
		err = fmt.Errorf("no auth provided")
	}
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	if err := dao.DBClient.SetStatusInvoice(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to set status invoice : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "successfully set status invoice",
	})
}

// GetInvoicePayment
// @Summary Get invoice payment
// @Description Get invoice payment
// @Tags GetInvoicePayment
// @Accept json
// @Produce json
// @Param request body helper.GetInvoiceReq true "Get invoice payment request"
// @Success 200 {object} map[string]interface{} "successfully get invoice payment"
// @Failure 400 {object} map[string]interface{} "failed to parse get invoice payment request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get invoice payment"
// @Router /account/v1alpha1/invoice/get-payment [post]
func GetInvoicePayment(c *gin.Context) {
	req, err := helper.ParseGetInvoiceReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse get invoice payment request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	payments, err := dao.DBClient.GetInvoicePayments(req.InvoiceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get invoice payment : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": payments,
	})
}

// UseGiftCode
// @Summary Use a gift code
// @Description Redeem a gift code and apply the credit to the user's account
// @Tags UseGiftCode
// @Accept json
// @Produce json
// @Param request body helper.UseGiftCodeReq true "Use gift code request"
// @Success 200 {object} helper.UseGiftCodeResp "Successfully redeemed gift code"
// @Failure 400 {object} helper.ErrorMessage "Failed to parse use gift code request"
// @Failure 401 {object} helper.ErrorMessage "Authentication error"
// @Failure 500 {object} helper.ErrorMessage "Failed to redeem gift code"
// @Router /account/v1alpha1/gift-code/use [post]
func UseGiftCode(c *gin.Context) {
	// Parse the use gift code request
	req, err := helper.ParseUseGiftCodeReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse use gift code request: %v", err)})
		return
	}

	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	// Use the gift code (to be implemented)
	if _, err := dao.DBClient.UseGiftCode(req); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to use gift code: %v", err)})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, helper.UseGiftCodeResp{
		Data: helper.UseGiftCodeRespData{
			UserID: req.Auth.UserID,
		},
		Message: "Gift code successfully redeemed",
	})
}

// UserUsage
// @Summary Get user usage
// @Description Get user usage within a specified time range
// @Tags UserUsage
// @Accept json
// @Produce json
// @Param request body helper.UserUsageReq true "User usage request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user usage"
// @Failure 400 {object} map[string]interface{} "failed to parse user usage request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user usage"
// @Router /account/v1alpha1/user-usage [post]
func UserUsage(c *gin.Context) {
	req, err := helper.ParseUserUsageReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user usage request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	usage, err := dao.DBClient.GetMonitorUniqueValues(req.StartTime, req.EndTime, req.NamespaceList)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get user usage : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": usage,
	})
}

// GetRechargeDiscount
// @Summary Get recharge discount
// @Description Get recharge discount
// @Tags RechargeDiscount
// @Accept json
// @Produce json
// @Param request body object true "Get recharge discount request"
// @Success 200 {object} map[string]interface{} "successfully get recharge discount"
// @Failure 400 {object} map[string]interface{} "failed to parse get recharge discount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get recharge discount"
// @Router /account/v1alpha1/recharge/discount [post]
func GetRechargeDiscount(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	discount, err := dao.DBClient.GetRechargeDiscount(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get recharge discount : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"discount": discount,
	})
}

// GetUserRealNameInfo
// @Summary Get user real name information
// @Description Retrieve the real name information for a user
// @Tags GetUserRealNameInfo
// @Accept json
// @Produce json
// @Success 200 {object} helper.GetRealNameInfoResp "Successfully retrieved user real name info"
// @Failure 400 {object} helper.ErrorMessage "Failed to parse get real name info request"
// @Failure 401 {object} helper.ErrorMessage "Authentication error"
// @Failure 500 {object} helper.ErrorMessage "Failed to get user real name info or info not found/verified"
// @Router /account/v1alpha1/real-name-info [post]
func GetUserRealNameInfo(c *gin.Context) {
	req := &helper.GetRealNameInfoReq{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	userRealNameInfo, err := dao.DBClient.GetUserRealNameInfo(req)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get user real name info: %v", err)})
		return
	}

	enterpriseRealNameInfo, err := dao.DBClient.GetEnterpriseRealNameInfo(req)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get enterprise real name info: %v", err)})
		return
	}

	isVerified := (userRealNameInfo != nil && userRealNameInfo.IsVerified) ||
		(enterpriseRealNameInfo != nil && enterpriseRealNameInfo.IsVerified)

	if !isVerified {
		c.JSON(http.StatusOK, helper.GetRealNameInfoResp{
			Data: helper.GetRealNameInfoRespData{
				UserID:     req.UserID,
				IsRealName: false,
			},
			Message: "user is not verified",
		})
		return
	}

	c.JSON(http.StatusOK, helper.GetRealNameInfoResp{
		Data: helper.GetRealNameInfoRespData{
			UserID:     req.UserID,
			IsRealName: true,
		},
		Message: "successfully get user real name info",
	})
}
