package api

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	auth2 "github.com/labring/sealos/service/pkg/auth"

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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
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

// GetConsumptionAmount
// @Summary Get user consumption amount
// @Description Get user consumption amount within a specified time range
// @Tags ConsumptionAmount
// @Accept json
// @Produce json
// @Param request body helper.UserBaseReq true "User consumption amount request"
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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

// GetPayment
// @Summary Get user payment
// @Description Get user payment within a specified time range
// @Tags Payment
// @Accept json
// @Produce json
// @Param request body helper.UserBaseReq true "User payment request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user payment"
// @Failure 400 {object} map[string]interface{} "failed to parse user payment request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user payment"
// @Router /account/v1alpha1/costs/payment [post]
func GetPayment(c *gin.Context) {
	req, err := helper.ParseUserBaseReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user payment request: %v", err)})
		return
	}
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	payment, err := dao.DBClient.GetPayment(types.UserQueryOpts{Owner: req.Owner}, req.TimeRange.StartTime, req.TimeRange.EndTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get payment : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"payment": payment,
	})
}

// GetRechargeAmount
// @Summary Get user recharge amount
// @Description Get user recharge amount within a specified time range
// @Tags RechargeAmount
// @Accept json
// @Produce json
// @Param request body helper.UserBaseReq true "User recharge amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user recharge amount"
// @Failure 400 {object} map[string]interface{} "failed to parse user recharge amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user recharge amount"
// @Router /account/v1alpha1/costs/recharge [post]
func GetRechargeAmount(c *gin.Context) {
	req, err := helper.ParseUserBaseReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user recharge amount request: %v", err)})
		return
	}
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	amount, err := dao.DBClient.GetRechargeAmount(types.UserQueryOpts{Owner: req.Owner}, req.TimeRange.StartTime, req.TimeRange.EndTime)
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
// @Param request body helper.UserBaseReq true "User properties used amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user properties used amount"
// @Failure 400 {object} map[string]interface{} "failed to parse user properties used amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user properties used amount"
// @Router /account/v1alpha1/costs/properties [post]
func GetPropertiesUsedAmount(c *gin.Context) {
	req, err := helper.ParseUserBaseReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user properties used amount request: %v", err)})
		return
	}
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	amount, err := dao.DBClient.GetPropertiesUsedAmount(req.Owner, req.TimeRange.StartTime, req.TimeRange.EndTime)
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

// @Summary Get user costs
// @Description Get user costs within a specified time range
// @Tags Costs
// @Accept json
// @Produce json
// @Param request body helper.UserBaseReq true "User costs amount request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user costs"
// @Failure 400 {object} map[string]interface{} "failed to parse user hour costs amount request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user costs"
// @Router /account/v1alpha1/costs [post]
func GetCosts(c *gin.Context) {
	req, err := helper.ParseUserBaseReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user hour costs amount request: %v", err)})
		return
	}
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	costs, err := dao.DBClient.GetCosts(req.Auth.Owner, req.TimeRange.StartTime, req.TimeRange.EndTime)
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
// @Param request body helper.Auth true "auth request"
// @Success 200 {object} map[string]interface{} "successfully retrieved user account"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user account"
// @Router /account/v1alpha1/account [post]
func GetAccount(c *gin.Context) {
	req, err := helper.ParseUserBaseReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user hour costs amount request: %v", err)})
		return
	}
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	account, err := dao.DBClient.GetAccount(types.UserQueryOpts{Owner: req.Auth.Owner})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get account : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"account": account,
	})
}

// SetPaymentInvoice
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	ops := types.GetTransfersReq{
		UserQueryOpts: &types.UserQueryOpts{Owner: req.Auth.Owner},
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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
// @Param request body helper.UserBaseReq true "Check permission request"
// @Success 200 {object} map[string]interface{} "successfully check permission"
// @Failure 400 {object} map[string]interface{} "failed to parse check permission request"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to check permission"
// @Router /account/v1alpha1/check-permission [post]
func CheckPermission(c *gin.Context) {
	req, err := helper.ParseUserBaseReq(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("failed to parse check permission request: %v", err)})
		return
	}
	if err = CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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
// @Router /account/v1alpha1/basic-cost-distribution [post]
func GetBasicCostDistribution(c *gin.Context) {
	req, err := helper.ParseGetCostAppListReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse basic cost distribution request: %v", err)})
		return
	}
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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
	if err := CheckAuthAndCalibrate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
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

func CheckAuthAndCalibrate(auth *helper.Auth) (err error) {
	if !dao.Debug || auth.KubeConfig != "" {
		if err = checkAuth(auth); err != nil {
			return fmt.Errorf("check auth error: %v", err)
		}
	}
	auth.Owner, err = dao.DBClient.GetUserCrName(types.UserQueryOpts{ID: auth.UserID})
	if err != nil {
		return fmt.Errorf("get user cr name error: %v", err)
	}
	fmt.Printf("auth: %v\n", auth)
	return nil
}

func checkAuth(auth *helper.Auth) error {
	if err := helper.AuthenticateKC(*auth); err != nil {
		return fmt.Errorf("authenticate error : %v", err)
	}
	host, err := auth2.GetKcHost(auth.KubeConfig)
	if err != nil {
		return fmt.Errorf("failed to get kc host: %v", err)
	}
	host = strings.TrimPrefix(strings.TrimPrefix(host, "https://"), "http://")
	if !strings.Contains(host, dao.Cfg.LocalRegionDomain) {
		if err := CalibrateRegionAuth(auth, host); err != nil {
			return fmt.Errorf("calibrate region auth error: %v", err)
		}
	} else {
		user, err := auth2.GetKcUser(auth.KubeConfig)
		if err != nil {
			return fmt.Errorf("failed to get kc user: %v", err)
		}
		userID, err := dao.DBClient.GetUserID(types.UserQueryOpts{Owner: user})
		if err != nil {
			return fmt.Errorf("get user id error: %v", err)
		}
		auth.UserID = userID
	}
	auth.Owner, err = dao.DBClient.GetUserCrName(types.UserQueryOpts{ID: auth.UserID})
	if err != nil {
		return fmt.Errorf("get user cr name error: %v", err)
	}
	return nil
}

func CalibrateRegionAuth(auth *helper.Auth, kcHost string) error {
	for i := range dao.Cfg.Regions {
		reg := dao.Cfg.Regions[i]
		if !strings.Contains(kcHost, reg.Domain) {
			continue
		}
		svcURL := fmt.Sprintf("https://%s%s%s", reg.AccountSvc, helper.GROUP, helper.CheckPermission)

		authBody, err := json.Marshal(auth)
		if err != nil {
			return fmt.Errorf("failed to marshal auth: %v", err)
		}
		tr := &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: os.Getenv("INSECURE_VERIFY") != "true", MinVersion: tls.VersionTLS13},
		}
		client := &http.Client{Transport: tr}
		resp, err := client.Post(svcURL, "application/json", bytes.NewBuffer(authBody))
		if err != nil {
			return fmt.Errorf("failed to post request: %v", err)
		}
		defer resp.Body.Close()

		responseBody := new(bytes.Buffer)
		_, err = responseBody.ReadFrom(resp.Body)
		if err != nil {
			return fmt.Errorf("failed to read response body: %v", err)
		}
		var respMap map[string]interface{}
		if err = json.Unmarshal(responseBody.Bytes(), &respMap); err != nil {
			return fmt.Errorf("failed to unmarshal response body: %v", err)
		}
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("failed to check permission: %v, error: %s", resp, respMap["error"])
		}
		_userID, ok := respMap["userID"]
		if !ok {
			return fmt.Errorf("failed to get userID from response: %v", respMap)
		}
		userID, ok := _userID.(string)
		if !ok {
			return fmt.Errorf("failed to convert userID to string: %v", _userID)
		}
		auth.UserID = userID
		return nil
	}
	return fmt.Errorf("failed to calibrate region auth")
}
