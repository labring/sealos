package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"gorm.io/gorm"
)

func adminReadPage(c *gin.Context) (int, int, error) {
	pageIndex := 0
	pageSize := 10
	var err error
	if raw := c.Query("pageIndex"); raw != "" {
		pageIndex, err = strconv.Atoi(raw)
		if err != nil || pageIndex < 0 {
			return 0, 0, errors.New("pageIndex must be a non-negative integer")
		}
	}
	if raw := c.Query("pageSize"); raw != "" {
		pageSize, err = strconv.Atoi(raw)
		if err != nil || pageSize <= 0 || pageSize > 100 {
			return 0, 0, errors.New("pageSize must be between 1 and 100")
		}
	}
	return pageIndex, pageSize, nil
}

func adminReadTime(c *gin.Context, name string) (*time.Time, error) {
	raw := c.Query(name)
	if raw == "" {
		return nil, nil
	}
	value, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil, fmt.Errorf("%s must be RFC3339: %w", name, err)
	}
	return &value, nil
}

func adminReadUnauthorized(c *gin.Context, err error) {
	c.JSON(
		http.StatusUnauthorized,
		helper.ErrorMessage{Error: fmt.Sprintf("authenticate error: %v", err)},
	)
}

func adminReadFailure(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, helper.ErrorMessage{Error: "resource not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: err.Error()})
}

// AdminListUsers returns account users and their global account/provider data.
// @Summary List users for admin
// @Tags AdminRead
// @Produce json
// @Param pageIndex query int false "Zero-based page index"
// @Param pageSize query int false "Page size, 1-100"
// @Param id query string false "User ID"
// @Param username query string false "Password provider username"
// @Param phone query string false "Phone provider ID"
// @Param workspaceId query string false "Workspace ID"
// @Param workspaceName query string false "Workspace display name"
// @Success 200 {object} helper.AdminUserListResp
// @Router /admin/v1alpha1/users [get]
func AdminListUsers(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	pageIndex, pageSize, err := adminReadPage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	result, err := dao.DBClient.ListAdminUsers(helper.AdminUserListReq{
		PageIndex: pageIndex, PageSize: pageSize,
		ID: c.Query("id"), Username: c.Query("username"), Phone: c.Query("phone"),
		WorkspaceID: c.Query("workspaceId"), WorkspaceName: c.Query("workspaceName"),
	})
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminGetUser returns the account-domain user detail aggregate.
// @Summary Get user detail for admin
// @Tags AdminRead
// @Produce json
// @Param id query string true "User ID"
// @Success 200 {object} helper.AdminUserDetail
// @Router /admin/v1alpha1/user [get]
func AdminGetUser(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "id is required"})
		return
	}
	result, err := dao.DBClient.GetAdminUser(id)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminListUserRechargeRecords returns paginated payments and refund summaries.
// @Summary List user recharge records for admin
// @Tags AdminRead
// @Produce json
// @Param id query string true "User ID"
// @Param pageIndex query int false "Zero-based page index"
// @Param pageSize query int false "Page size, 1-100"
// @Success 200 {object} helper.AdminRechargeRecordsResp
// @Router /admin/v1alpha1/user/recharge-records [get]
func AdminListUserRechargeRecords(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "id is required"})
		return
	}
	pageIndex, pageSize, err := adminReadPage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	result, err := dao.DBClient.ListAdminUserRechargeRecords(id, pageIndex, pageSize)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminListUserBalanceAdjustRecords returns admin balance adjustments for a user.
// @Summary List user balance adjustments for admin
// @Tags AdminRead
// @Produce json
// @Param id query string true "User ID"
// @Param pageIndex query int false "Zero-based page index"
// @Param pageSize query int false "Page size, 1-100"
// @Success 200 {object} helper.AdminBalanceAdjustRecordsResp
// @Router /admin/v1alpha1/user/balance-adjust-records [get]
func AdminListUserBalanceAdjustRecords(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "id is required"})
		return
	}
	pageIndex, pageSize, err := adminReadPage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	result, err := dao.DBClient.ListAdminUserBalanceAdjustRecords(id, pageIndex, pageSize)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminListGiftCodes returns filtered gift codes.
// @Summary List gift codes for admin
// @Tags AdminRead
// @Produce json
// @Success 200 {object} helper.AdminGiftCodeListResp
// @Router /admin/v1alpha1/gift-codes [get]
func AdminListGiftCodes(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	pageIndex, pageSize, err := adminReadPage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	startTime, err := adminReadTime(c, "startTime")
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	endTime, err := adminReadTime(c, "endTime")
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	result, err := dao.DBClient.ListAdminGiftCodes(helper.AdminGiftCodeListReq{
		PageIndex:    pageIndex,
		PageSize:     pageSize,
		Status:       c.Query("status"),
		StartTime:    startTime,
		EndTime:      endTime,
		ID:           c.Query("id"),
		Code:         c.Query("code"),
		Comment:      c.Query("comment"),
		RechargeType: c.Query("rechargeType"),
	})
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminListGiftCodeUsage returns gift codes redeemed by a user.
// @Summary List user gift code usage for admin
// @Tags AdminRead
// @Produce json
// @Param id query string true "User ID"
// @Success 200 {object} helper.AdminGiftCodeUsageResp
// @Router /admin/v1alpha1/gift-codes/usage [get]
func AdminListGiftCodeUsage(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "id is required"})
		return
	}
	pageIndex, pageSize, err := adminReadPage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	result, err := dao.DBClient.ListAdminGiftCodeUsage(id, pageIndex, pageSize)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminListInvoices returns filtered invoices.
// @Summary List invoices for admin
// @Tags AdminRead
// @Produce json
// @Success 200 {object} helper.AdminInvoiceListResp
// @Router /admin/v1alpha1/invoices [get]
func AdminListInvoices(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	pageIndex, pageSize, err := adminReadPage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: err.Error()})
		return
	}
	result, err := dao.DBClient.ListAdminInvoices(
		helper.AdminInvoiceListReq{
			PageIndex:   pageIndex,
			PageSize:    pageSize,
			Status:      c.Query("status"),
			CompanyName: c.Query("companyName"),
		},
	)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminGetInvoice returns a single invoice.
// @Summary Get invoice for admin
// @Tags AdminRead
// @Produce json
// @Param id query string true "Invoice ID"
// @Success 200 {object} helper.AdminInvoice
// @Router /admin/v1alpha1/invoice [get]
func AdminGetInvoice(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "id is required"})
		return
	}
	result, err := dao.DBClient.GetAdminInvoice(id)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminGetRefundStatus returns refund state for a payment or trade number.
// @Summary Get refund status for admin
// @Tags AdminRead
// @Produce json
// @Param id query string true "Payment ID or trade number"
// @Success 200 {object} helper.AdminRefundStatusResp
// @Router /admin/v1alpha1/refund-status [get]
func AdminGetRefundStatus(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "id is required"})
		return
	}
	result, err := dao.DBClient.GetAdminRefundStatus(id)
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminGetRechargeGiftPolicy returns the account recharge discount policy.
// @Summary Get recharge gift policy for admin
// @Tags AdminRead
// @Produce json
// @Success 200 {object} helper.AdminRechargeGiftPolicy
// @Router /admin/v1alpha1/recharge-gift-policy [get]
func AdminGetRechargeGiftPolicy(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	result, err := dao.DBClient.GetAdminRechargeGiftPolicy()
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// AdminListRegions returns global region records.
// @Summary List regions for admin
// @Tags AdminRead
// @Produce json
// @Success 200 {array} helper.AdminRegion
// @Router /admin/v1alpha1/regions [get]
func AdminListRegions(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		adminReadUnauthorized(c, err)
		return
	}
	result, err := dao.DBClient.ListAdminRegions()
	if err != nil {
		adminReadFailure(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
