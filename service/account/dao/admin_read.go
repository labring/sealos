package dao

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/helper"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type adminUserAccountType struct {
	UserType      string         `gorm:"column:userType"`
	ProductSeries pq.StringArray `gorm:"column:productSeries"`
}

type adminWorkspaceRow struct {
	UID         uuid.UUID `gorm:"column:uid"`
	ID          string    `gorm:"column:id"`
	DisplayName string    `gorm:"column:displayName"`
	Role        string    `gorm:"column:role"`
	Status      string    `gorm:"column:status"`
	IsPrivate   bool      `gorm:"column:isPrivate"`
}

type adminPaymentRow struct {
	ID           string    `gorm:"column:id"`
	TradeNo      string    `gorm:"column:trade_no"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	Method       string    `gorm:"column:method"`
	Status       string    `gorm:"column:status"`
	Amount       int64     `gorm:"column:amount"`
	Gift         *int64    `gorm:"column:gift"`
	Type         string    `gorm:"column:type"`
	ChargeSource string    `gorm:"column:charge_source"`
}

type adminAccountTransactionRow struct {
	ID            uuid.UUID `gorm:"column:id"`
	CreatedAt     time.Time `gorm:"column:created_at"`
	Type          string    `gorm:"column:type"`
	Balance       int64     `gorm:"column:balance"`
	BalanceBefore *int64    `gorm:"column:balance_before"`
	Message       *string   `gorm:"column:message"`
}

type adminGiftCodeRow struct {
	ID            uuid.UUID  `gorm:"column:id"`
	Code          string     `gorm:"column:code"`
	Used          bool       `gorm:"column:used"`
	CreditAmount  int64      `gorm:"column:creditAmount"`
	UsedBy        *uuid.UUID `gorm:"column:usedBy"`
	UsedByUserID  string     `gorm:"column:usedByUserID"`
	UsedAt        *time.Time `gorm:"column:usedAt"`
	CreatedAt     time.Time  `gorm:"column:createdAt"`
	ExpiredAt     *time.Time `gorm:"column:expiredAt"`
	Comment       string     `gorm:"column:comment"`
	CreatedBy     string     `gorm:"column:createdBy"`
	CreatedByID   string     `gorm:"column:createdByID"`
	CreatedByReal *string    `gorm:"column:createdByReal"`
	RechargeType  string     `gorm:"column:rechargeType"`
}

type adminGiftCodeUsageRow struct {
	ID           uuid.UUID  `gorm:"column:id"`
	Code         string     `gorm:"column:code"`
	CreditAmount int64      `gorm:"column:creditAmount"`
	UsedAt       *time.Time `gorm:"column:usedAt"`
	RechargeType string     `gorm:"column:rechargeType"`
	Comment      string     `gorm:"column:comment"`
}

type adminInvoiceRow struct {
	ID          string     `gorm:"column:id"`
	UserID      string     `gorm:"column:user_id"`
	CreatedAt   *time.Time `gorm:"column:created_at"`
	UpdatedAt   *time.Time `gorm:"column:updated_at"`
	Detail      string     `gorm:"column:detail"`
	Remark      string     `gorm:"column:remark"`
	TotalAmount int64      `gorm:"column:total_amount"`
	Status      string     `gorm:"column:status"`
}

func adminPage(pageIndex, pageSize int, total int64) helper.AdminPage {
	pages := 0
	if total > 0 {
		pages = int((total + int64(pageSize) - 1) / int64(pageSize))
	}
	return helper.AdminPage{
		PageIndex:  pageIndex,
		PageSize:   pageSize,
		TotalItems: total,
		TotalPages: pages,
	}
}

func adminUserQuery(db *gorm.DB, req helper.AdminUserListReq) *gorm.DB {
	query := db.Model(&types.User{})
	if req.ID != "" {
		query = query.Where(`"User"."id" = ?`, req.ID)
	}
	if req.Username != "" {
		query = query.Where(
			`EXISTS (SELECT 1 FROM "OauthProvider" op WHERE op."userUid" = "User".uid AND op."providerType" = ? AND op."providerId" = ?)`,
			types.OauthProviderTypePassword,
			req.Username,
		)
	}
	if req.Phone != "" {
		query = query.Where(
			`EXISTS (SELECT 1 FROM "OauthProvider" op WHERE op."userUid" = "User".uid AND op."providerType" = ? AND op."providerId" = ?)`,
			types.OauthProviderTypePhone,
			req.Phone,
		)
	}
	return query
}

func (g *Cockroach) userUIDsByWorkspace(id, displayName string) ([]uuid.UUID, error) {
	query := g.ck.GetLocalDB().Table("UserCr").
		Select(`DISTINCT "UserCr"."userUid"`).
		Joins(`JOIN "UserWorkspace" ON "UserWorkspace"."userCrUid" = "UserCr".uid`).
		Joins(`JOIN "Workspace" ON "Workspace".uid = "UserWorkspace"."workspaceUid"`)
	if id != "" {
		query = query.Where(`"Workspace"."id" = ?`, id)
	}
	if displayName != "" {
		query = query.Where(`"Workspace"."displayName" = ?`, displayName)
	}
	var rows []struct {
		UserUID uuid.UUID `gorm:"column:userUid"`
	}
	if err := query.Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to query workspace users: %w", err)
	}
	result := make([]uuid.UUID, 0, len(rows))
	for i := range rows {
		result = append(result, rows[i].UserUID)
	}
	return result, nil
}

func (g *Cockroach) loadAdminUsers(users []types.User) ([]helper.AdminUser, error) {
	if len(users) == 0 {
		return []helper.AdminUser{}, nil
	}

	userUIDs := make([]uuid.UUID, len(users))
	for i := range users {
		userUIDs[i] = users[i].UID
	}
	db := g.ck.GetGlobalDB()

	var providers []types.OauthProvider
	if err := db.Where(`"userUid" IN ?`, userUIDs).Find(&providers).Error; err != nil {
		return nil, fmt.Errorf("failed to list oauth providers for admin users: %w", err)
	}
	var alertAccounts []types.UserAlertNotificationAccount
	if err := db.Where(`"user_uid" IN ? AND "is_enabled" = ?`, userUIDs, true).
		Find(&alertAccounts).
		Error; err != nil {
		return nil, fmt.Errorf(
			"failed to list alert notification accounts for admin users: %w",
			err,
		)
	}
	var accounts []types.Account
	if err := db.Where(`"userUid" IN ?`, userUIDs).Find(&accounts).Error; err != nil {
		return nil, fmt.Errorf("failed to list accounts for admin users: %w", err)
	}

	providersByUser := groupAdminUserProviders(providers, alertAccounts)
	accountsByUser := make(map[uuid.UUID]*types.Account, len(accounts))
	for i := range accounts {
		accountsByUser[accounts[i].UserUID] = &accounts[i]
	}
	result := make([]helper.AdminUser, len(users))
	for i := range users {
		result[i] = formatAdminUser(
			&users[i],
			providersByUser[users[i].UID],
			accountsByUser[users[i].UID],
		)
	}
	return result, nil
}

func groupAdminUserProviders(
	providers []types.OauthProvider,
	alertAccounts []types.UserAlertNotificationAccount,
) map[uuid.UUID][]types.OauthProvider {
	providersByUser := make(map[uuid.UUID][]types.OauthProvider)
	existingProviders := make(map[uuid.UUID]map[string]struct{})
	for i := range providers {
		provider := providers[i]
		providersByUser[provider.UserUID] = append(providersByUser[provider.UserUID], provider)
		if existingProviders[provider.UserUID] == nil {
			existingProviders[provider.UserUID] = make(map[string]struct{})
		}
		existingProviders[provider.UserUID][adminProviderKey(provider.ProviderType, provider.ProviderID)] = struct{}{}
	}
	for i := range alertAccounts {
		account := alertAccounts[i]
		if account.ProviderType != types.OauthProviderTypeEmail &&
			account.ProviderType != types.OauthProviderTypePhone {
			continue
		}
		if existingProviders[account.UserUID] == nil {
			existingProviders[account.UserUID] = make(map[string]struct{})
		}
		key := adminProviderKey(account.ProviderType, account.ProviderID)
		if _, exists := existingProviders[account.UserUID][key]; exists {
			continue
		}
		providersByUser[account.UserUID] = append(
			providersByUser[account.UserUID],
			types.OauthProvider{
				UserUID:      account.UserUID,
				ProviderType: account.ProviderType,
				ProviderID:   account.ProviderID,
				CreatedAt:    account.CreatedAt,
				UpdatedAt:    account.UpdatedAt,
			},
		)
		existingProviders[account.UserUID][key] = struct{}{}
	}
	return providersByUser
}

func adminProviderKey(providerType types.OauthProviderType, providerID string) string {
	return string(providerType) + "_" + providerID
}

func formatAdminUser(
	user *types.User,
	providers []types.OauthProvider,
	account *types.Account,
) helper.AdminUser {
	item := helper.AdminUser{
		UID:                 user.UID,
		ID:                  user.ID,
		Nickname:            user.Nickname,
		Status:              string(user.Status),
		BillingStatus:       "no_account",
		SourceType:          "OTHER",
		SourceProviderTypes: make([]string, 0, len(providers)),
	}
	providerTypes := make([]string, 0, len(providers))
	for i := range providers {
		providerType := string(providers[i].ProviderType)
		providerTypes = append(providerTypes, providerType)
		switch providers[i].ProviderType {
		case types.OauthProviderTypePassword:
			if item.Username == "" {
				item.Username = providers[i].ProviderID
			}
		case types.OauthProviderTypePhone:
			item.Phone = providers[i].ProviderID
		case types.OauthProviderTypeEmail:
			item.Email = providers[i].ProviderID
		}
	}
	if item.Username != "" {
		item.SourceType = "ADMIN_CREATED"
		item.SourceProviderTypes = []string{string(types.OauthProviderTypePassword)}
	} else {
		for _, providerType := range []string{"GITHUB", "WECHAT", "GOOGLE", "OAUTH2"} {
			for _, actual := range providerTypes {
				if providerType == actual {
					item.SourceType = "OAUTH_LOGIN"
					item.SourceProviderTypes = append(item.SourceProviderTypes, actual)
				}
			}
		}
		if item.SourceType == "OTHER" {
			item.SourceProviderTypes = providerTypes
		}
	}
	if account != nil {
		balance := account.Balance
		deduction := account.DeductionBalance
		available := balance - deduction
		item.Balance = &balance
		item.DeductionBalance = &deduction
		item.AvailableBalance = &available
		item.BillingStatus = "normal"
		if available < 0 {
			item.BillingStatus = "insufficient"
		}
	}
	return item
}

func (g *Cockroach) adminUserWorkspaces(userUID uuid.UUID) ([]helper.AdminWorkspace, error) {
	var rows []adminWorkspaceRow
	err := g.ck.GetLocalDB().Table("UserCr").
		Select(`"Workspace".uid, "Workspace".id, "Workspace"."displayName", "UserWorkspace".role, "UserWorkspace".status, "UserWorkspace"."isPrivate"`).
		Joins(`JOIN "UserWorkspace" ON "UserWorkspace"."userCrUid" = "UserCr".uid`).
		Joins(`JOIN "Workspace" ON "Workspace".uid = "UserWorkspace"."workspaceUid"`).
		Where(`"UserCr"."userUid" = ?`, userUID).
		Order(`"Workspace".id ASC`).
		Find(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get user workspaces: %w", err)
	}
	result := make([]helper.AdminWorkspace, len(rows))
	for i := range rows {
		result[i] = helper.AdminWorkspace{
			UID: rows[i].UID, ID: rows[i].ID, DisplayName: rows[i].DisplayName,
			Role: rows[i].Role, Status: rows[i].Status, IsPrivate: rows[i].IsPrivate,
		}
	}
	return result, nil
}

func (g *Cockroach) ListAdminUsers(req helper.AdminUserListReq) (helper.AdminUserListResp, error) {
	pageIndex, pageSize := normalizeAdminPage(req.PageIndex, req.PageSize)
	var workspaceUIDs []uuid.UUID
	if req.WorkspaceID != "" || req.WorkspaceName != "" {
		var err error
		workspaceUIDs, err = g.userUIDsByWorkspace(req.WorkspaceID, req.WorkspaceName)
		if err != nil {
			return helper.AdminUserListResp{}, err
		}
	}
	query := adminUserQuery(g.ck.GetGlobalDB(), req)
	if req.WorkspaceID != "" || req.WorkspaceName != "" {
		if len(workspaceUIDs) == 0 {
			return helper.AdminUserListResp{
				AdminPage: adminPage(pageIndex, pageSize, 0),
				List:      []helper.AdminUser{},
			}, nil
		}
		query = query.Where(`"User".uid IN ?`, workspaceUIDs)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return helper.AdminUserListResp{}, fmt.Errorf("failed to count admin users: %w", err)
	}
	var users []types.User
	if err := query.Order(`"User"."createdAt" DESC`).
		Offset(pageIndex * pageSize).
		Limit(pageSize).
		Find(&users).
		Error; err != nil {
		return helper.AdminUserListResp{}, fmt.Errorf("failed to list admin users: %w", err)
	}
	list, err := g.loadAdminUsers(users)
	if err != nil {
		return helper.AdminUserListResp{}, err
	}
	return helper.AdminUserListResp{
		AdminPage: adminPage(pageIndex, pageSize, total),
		List:      list,
	}, nil
}

func (g *Cockroach) GetAdminUser(id string) (*helper.AdminUserDetail, error) {
	var user types.User
	if err := g.ck.GetGlobalDB().Where(`id = ?`, id).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	providers, err := g.ck.GetUserOauthProvider(&types.UserQueryOpts{UID: user.UID})
	if err != nil {
		return nil, err
	}
	account, err := g.GetAccount(types.UserQueryOpts{UID: user.UID, IgnoreEmpty: true})
	if err != nil {
		return nil, err
	}
	item := formatAdminUser(&user, providers, account)
	var realName, idCard string
	userRealName, realNameErr := g.ck.GetUserRealNameInfoByUserID(user.ID)
	if realNameErr != nil && !errors.Is(realNameErr, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to get user real name info: %w", realNameErr)
	}
	if userRealName != nil {
		if userRealName.RealName != nil {
			realName = *userRealName.RealName
		}
		if userRealName.IDCard != nil {
			idCard = *userRealName.IDCard
		}
	}
	var accountType adminUserAccountType
	if err := g.ck.GetGlobalDB().
		Table("UserAccountType").
		Where(`"userUid" = ?`, user.UID).
		First(&accountType).
		Error; err != nil &&
		!errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to get user account type: %w", err)
	}
	workspaces, err := g.adminUserWorkspaces(user.UID)
	if err != nil {
		return nil, err
	}
	rechargeAmount, err := g.adminUserRechargeAmount(user.UID)
	if err != nil {
		return nil, err
	}
	if accountType.UserType != "" {
		itemType := accountType.UserType
		series := make([]string, len(accountType.ProductSeries))
		copy(series, accountType.ProductSeries)
		return &helper.AdminUserDetail{
			AdminUser: item, UserType: itemType, ProductSeries: series,
			RealName: realName, IDCard: idCard, RechargeAmount: rechargeAmount,
			Workspaces: workspaces,
		}, nil
	}
	return &helper.AdminUserDetail{
		AdminUser: item, UserType: "EXTERNAL_USER", ProductSeries: []string{},
		RealName: realName, IDCard: idCard,
		RechargeAmount: rechargeAmount,
		Workspaces:     workspaces,
	}, nil
}

func (g *Cockroach) adminUserRechargeAmount(userUID uuid.UUID) (int64, error) {
	var amount int64
	if err := g.ck.GetGlobalDB().Model(&types.Payment{}).
		Where(`"userUid" = ? AND "invoiced_at" = ?`, userUID, true).
		Select(`COALESCE(SUM(amount), 0)`).Scan(&amount).Error; err != nil {
		return 0, fmt.Errorf("failed to get recharge amount: %w", err)
	}
	return amount, nil
}

func normalizeAdminPage(pageIndex, pageSize int) (int, int) {
	if pageIndex < 0 {
		pageIndex = 0
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return pageIndex, pageSize
}

func (g *Cockroach) resolveAdminUserID(id string) (uuid.UUID, error) {
	var user types.User
	if err := g.ck.GetGlobalDB().Where(`id = ?`, id).First(&user).Error; err != nil {
		return uuid.Nil, fmt.Errorf("failed to get user: %w", err)
	}
	return user.UID, nil
}

func (g *Cockroach) ListAdminUserRechargeRecords(
	id string,
	pageIndex, pageSize int,
) (helper.AdminRechargeRecordsResp, error) {
	userUID, err := g.resolveAdminUserID(id)
	if err != nil {
		return helper.AdminRechargeRecordsResp{}, err
	}
	pageIndex, pageSize = normalizeAdminPage(pageIndex, pageSize)
	query := g.ck.GetGlobalDB().Table("Payment").Where(`"userUid" = ?`, userUID)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return helper.AdminRechargeRecordsResp{}, fmt.Errorf(
			"failed to count recharge records: %w",
			err,
		)
	}
	var rows []adminPaymentRow
	if err := query.Select(`id, trade_no, created_at, method, status, amount, gift, type, charge_source`).
		Order(`created_at DESC`).
		Offset(pageIndex * pageSize).
		Limit(pageSize).
		Scan(&rows).
		Error; err != nil {
		return helper.AdminRechargeRecordsResp{}, fmt.Errorf(
			"failed to list recharge records: %w",
			err,
		)
	}
	tradeNos := make([]string, 0, len(rows))
	for i := range rows {
		if tradeNo := normalizeAdminTradeNo(rows[i].TradeNo); tradeNo != "" {
			tradeNos = append(tradeNos, tradeNo)
		}
	}
	refunds := map[string][]types.PaymentRefund{}
	if len(tradeNos) > 0 {
		var refundRows []types.PaymentRefund
		if err := g.ck.GetGlobalDB().
			Where(`trade_no IN ?`, tradeNos).
			Order(`created_at DESC`).
			Find(&refundRows).
			Error; err != nil {
			return helper.AdminRechargeRecordsResp{}, fmt.Errorf(
				"failed to list recharge refunds: %w",
				err,
			)
		}
		for i := range refundRows {
			key := normalizeAdminTradeNo(refundRows[i].TradeNo)
			refunds[key] = append(refunds[key], refundRows[i])
		}
	}
	list := make([]helper.AdminRechargeRecord, len(rows))
	for i := range rows {
		refundList := refunds[normalizeAdminTradeNo(rows[i].TradeNo)]
		item := helper.AdminRechargeRecord{
			ID:           rows[i].ID,
			TradeNo:      rows[i].TradeNo,
			CreatedAt:    rows[i].CreatedAt,
			Method:       rows[i].Method,
			Status:       rows[i].Status,
			Amount:       rows[i].Amount,
			Gift:         rows[i].Gift,
			Type:         rows[i].Type,
			ChargeSource: rows[i].ChargeSource,
			RefundCount:  len(refundList),
			Refunded:     strings.EqualFold(rows[i].Status, "REFUNDED") || len(refundList) > 0,
		}
		if len(refundList) > 0 {
			item.LatestRefund = adminRefund(&refundList[0])
		}
		list[i] = item
	}
	return helper.AdminRechargeRecordsResp{
		AdminPage: adminPage(pageIndex, pageSize, total),
		List:      list,
	}, nil
}

func normalizeAdminTradeNo(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if len(value) == 32 {
		value = value[:8] + "-" + value[8:12] + "-" + value[12:16] + "-" + value[16:20] + "-" + value[20:]
	}
	if _, err := uuid.Parse(value); err != nil {
		return ""
	}
	return value
}

func adminRefund(refund *types.PaymentRefund) *helper.AdminRefund {
	return &helper.AdminRefund{
		ID:           refund.ID,
		RefundNo:     refund.RefundNo,
		RefundAmount: refund.RefundAmount,
		DeductAmount: refund.DeductAmount,
		CreatedAt:    refund.CreatedAt,
		RefundReason: refund.RefundReason,
	}
}

func (g *Cockroach) ListAdminUserBalanceAdjustRecords(
	id string,
	pageIndex, pageSize int,
) (helper.AdminBalanceAdjustRecordsResp, error) {
	userUID, err := g.resolveAdminUserID(id)
	if err != nil {
		return helper.AdminBalanceAdjustRecordsResp{}, err
	}
	pageIndex, pageSize = normalizeAdminPage(pageIndex, pageSize)
	query := g.ck.GetGlobalDB().
		Table("AccountTransaction").
		Where(`"userUid" = ? AND "type" = ?`, userUID, "AdminRecharge")
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return helper.AdminBalanceAdjustRecordsResp{}, fmt.Errorf(
			"failed to count balance adjustment records: %w",
			err,
		)
	}
	var rows []adminAccountTransactionRow
	if err := query.Select(`id, created_at, type, balance, balance_before, message`).
		Order(`created_at DESC`).
		Offset(pageIndex * pageSize).
		Limit(pageSize).
		Scan(&rows).
		Error; err != nil {
		return helper.AdminBalanceAdjustRecordsResp{}, fmt.Errorf(
			"failed to list balance adjustment records: %w",
			err,
		)
	}
	list := make([]helper.AdminBalanceAdjustRecord, len(rows))
	for i := range rows {
		var amount *int64
		if rows[i].BalanceBefore != nil {
			value := rows[i].Balance - *rows[i].BalanceBefore
			amount = &value
		}
		message := ""
		if rows[i].Message != nil {
			message = *rows[i].Message
		}
		list[i] = helper.AdminBalanceAdjustRecord{
			ID:            rows[i].ID,
			CreatedAt:     rows[i].CreatedAt,
			Type:          rows[i].Type,
			Amount:        amount,
			BalanceBefore: rows[i].BalanceBefore,
			BalanceAfter:  rows[i].Balance,
			Message:       message,
		}
	}
	return helper.AdminBalanceAdjustRecordsResp{
		AdminPage: adminPage(pageIndex, pageSize, total),
		List:      list,
	}, nil
}

func (g *Cockroach) ListAdminGiftCodes(
	req helper.AdminGiftCodeListReq,
) (helper.AdminGiftCodeListResp, error) {
	pageIndex, pageSize := normalizeAdminPage(req.PageIndex, req.PageSize)
	query := g.ck.GetGlobalDB().Table("GiftCode").
		Select(`"GiftCode"."id", "GiftCode"."code", "GiftCode"."used", "GiftCode"."creditAmount", "GiftCode"."usedBy", used_user."id" AS "usedByUserID", "GiftCode"."usedAt", "GiftCode"."createdAt", "GiftCode"."expiredAt", "GiftCode"."comment", creator."id" AS "createdByID", creator."nickname" AS "createdBy", creator_real."realName" AS "createdByReal", "GiftCodeCreation"."rechargeType"`).
		Joins(`LEFT JOIN "GiftCodeCreation" ON "GiftCodeCreation"."giftCodeId" = "GiftCode"."id"`).
		Joins(`LEFT JOIN "User" creator ON creator."uid" = "GiftCodeCreation"."createdByUserUid"`).
		Joins(`LEFT JOIN "UserRealNameInfo" creator_real ON creator_real."userUid" = creator."uid"`).
		Joins(`LEFT JOIN "User" used_user ON used_user."uid" = "GiftCode"."usedBy"`)
	if req.ID != "" {
		query = query.Where(`CAST("GiftCode"."id" AS STRING) = ?`, req.ID)
	}
	if req.Code != "" {
		query = query.Where(`"GiftCode"."code" LIKE ?`, "%"+req.Code+"%")
	}
	if req.Comment != "" {
		query = query.Where(`"GiftCode"."comment" LIKE ?`, "%"+req.Comment+"%")
	}
	switch req.Status {
	case "used":
		query = query.Where(`"GiftCode"."used" = ?`, true)
	case "unused":
		query = query.Where(`"GiftCode"."used" = ?`, false)
	}
	if req.StartTime != nil {
		query = query.Where(`"GiftCode"."createdAt" >= ?`, *req.StartTime)
	}
	if req.EndTime != nil {
		query = query.Where(`"GiftCode"."createdAt" <= ?`, *req.EndTime)
	}
	if req.RechargeType != "" {
		query = query.Where(`"GiftCodeCreation"."rechargeType" = ?`, req.RechargeType)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return helper.AdminGiftCodeListResp{}, fmt.Errorf("failed to count gift codes: %w", err)
	}
	var rows []adminGiftCodeRow
	if err := query.Order(`"GiftCode"."createdAt" DESC`).
		Offset(pageIndex * pageSize).
		Limit(pageSize).
		Scan(&rows).
		Error; err != nil {
		return helper.AdminGiftCodeListResp{}, fmt.Errorf("failed to list gift codes: %w", err)
	}
	list := make([]helper.AdminGiftCode, len(rows))
	for i := range rows {
		createdBy := rows[i].CreatedByReal
		if createdBy == nil || *createdBy == "" {
			createdBy = &rows[i].CreatedBy
		}
		list[i] = helper.AdminGiftCode{
			ID:           rows[i].ID,
			Code:         rows[i].Code,
			Used:         rows[i].Used,
			CreditAmount: rows[i].CreditAmount,
			UsedBy:       rows[i].UsedBy,
			UsedAt:       rows[i].UsedAt,
			CreatedAt:    rows[i].CreatedAt,
			ExpiredAt:    rows[i].ExpiredAt,
			Comment:      rows[i].Comment,
			CreatedBy:    valueOrEmpty(createdBy),
			CreatedByID:  rows[i].CreatedByID,
			RechargeType: rows[i].RechargeType,
		}
	}
	return helper.AdminGiftCodeListResp{
		AdminPage: adminPage(pageIndex, pageSize, total),
		List:      list,
	}, nil
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (g *Cockroach) ListAdminGiftCodeUsage(
	id string,
	pageIndex, pageSize int,
) (helper.AdminGiftCodeUsageResp, error) {
	userUID, err := g.resolveAdminUserID(id)
	if err != nil {
		return helper.AdminGiftCodeUsageResp{}, err
	}
	pageIndex, pageSize = normalizeAdminPage(pageIndex, pageSize)
	query := g.ck.GetGlobalDB().Table("GiftCode").
		Select(`"GiftCode"."id", "GiftCode"."code", "GiftCode"."creditAmount", "GiftCode"."usedAt", "GiftCodeCreation"."rechargeType", "GiftCode"."comment"`).
		Joins(`LEFT JOIN "GiftCodeCreation" ON "GiftCodeCreation"."giftCodeId" = "GiftCode"."id"`).
		Where(`"GiftCode"."used" = ? AND "GiftCode"."usedBy" = ?`, true, userUID)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return helper.AdminGiftCodeUsageResp{}, fmt.Errorf(
			"failed to count gift code usage: %w",
			err,
		)
	}
	var rows []adminGiftCodeUsageRow
	if err := query.Order(`"GiftCode"."usedAt" DESC`).
		Offset(pageIndex * pageSize).
		Limit(pageSize).
		Scan(&rows).
		Error; err != nil {
		return helper.AdminGiftCodeUsageResp{}, fmt.Errorf(
			"failed to list gift code usage: %w",
			err,
		)
	}
	list := make([]helper.AdminGiftCodeUsage, len(rows))
	for i := range rows {
		list[i] = helper.AdminGiftCodeUsage{
			ID:           rows[i].ID,
			Code:         rows[i].Code,
			CreditAmount: rows[i].CreditAmount,
			UsedAt:       rows[i].UsedAt,
			RechargeType: rows[i].RechargeType,
			Comment:      rows[i].Comment,
		}
	}
	return helper.AdminGiftCodeUsageResp{
		AdminPage: adminPage(pageIndex, pageSize, total),
		List:      list,
	}, nil
}

func (g *Cockroach) ListAdminInvoices(
	req helper.AdminInvoiceListReq,
) (helper.AdminInvoiceListResp, error) {
	pageIndex, pageSize := normalizeAdminPage(req.PageIndex, req.PageSize)
	query := g.ck.GetGlobalDB().Table("Invoice")
	if req.Status != "" {
		query = query.Where(`status = ?`, req.Status)
	}
	if req.CompanyName != "" {
		query = query.Where(`detail LIKE ?`, "%"+req.CompanyName+"%")
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return helper.AdminInvoiceListResp{}, fmt.Errorf("failed to count invoices: %w", err)
	}
	var rows []adminInvoiceRow
	if err := query.Order(`created_at DESC`).
		Offset(pageIndex * pageSize).
		Limit(pageSize).
		Find(&rows).
		Error; err != nil {
		return helper.AdminInvoiceListResp{}, fmt.Errorf("failed to list invoices: %w", err)
	}
	return helper.AdminInvoiceListResp{
		AdminPage: adminPage(pageIndex, pageSize, total),
		List:      mapAdminInvoices(rows),
	}, nil
}

func mapAdminInvoices(rows []adminInvoiceRow) []helper.AdminInvoice {
	list := make([]helper.AdminInvoice, len(rows))
	for i := range rows {
		list[i] = helper.AdminInvoice{
			ID:          rows[i].ID,
			UserID:      rows[i].UserID,
			CreatedAt:   rows[i].CreatedAt,
			UpdatedAt:   rows[i].UpdatedAt,
			Detail:      rows[i].Detail,
			Remark:      rows[i].Remark,
			TotalAmount: rows[i].TotalAmount,
			Status:      rows[i].Status,
		}
	}
	return list
}

func (g *Cockroach) GetAdminInvoice(id string) (*helper.AdminInvoice, error) {
	var row adminInvoiceRow
	if err := g.ck.GetGlobalDB().
		Table("Invoice").
		Where(`id = ?`, id).
		First(&row).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get invoice: %w", err)
	}
	list := mapAdminInvoices([]adminInvoiceRow{row})
	return &list[0], nil
}

func (g *Cockroach) GetAdminRefundStatus(id string) (helper.AdminRefundStatusResp, error) {
	var order types.PaymentOrder
	err := g.ck.GetGlobalDB().Where(`id = ?`, id).First(&order).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		err = g.ck.GetGlobalDB().Where(`trade_no = ?`, id).First(&order).Error
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return helper.AdminRefundStatusResp{}, fmt.Errorf("failed to get payment order: %w", err)
	}
	tradeNo := id
	if err == nil {
		tradeNo = order.TradeNO
	}
	query := g.ck.GetGlobalDB().Model(&types.PaymentRefund{}).Where(`trade_no = ?`, tradeNo)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return helper.AdminRefundStatusResp{}, fmt.Errorf("failed to count refunds: %w", err)
	}
	var latest types.PaymentRefund
	latestErr := query.Order(`created_at DESC`).First(&latest).Error
	response := helper.AdminRefundStatusResp{
		Refunded:    total > 0,
		RefundCount: int(total),
		TradeNo:     tradeNo,
	}
	if latestErr == nil {
		response.LatestRefund = adminRefund(&latest)
	} else if !errors.Is(latestErr, gorm.ErrRecordNotFound) {
		return helper.AdminRefundStatusResp{}, fmt.Errorf(
			"failed to get latest refund: %w",
			latestErr,
		)
	}
	return response, nil
}

func (g *Cockroach) GetAdminRechargeGiftPolicy() (helper.AdminRechargeGiftPolicy, error) {
	var config types.Configs
	err := g.ck.GetGlobalDB().
		Where(&types.Configs{Type: types.AccountConfigType}).
		First(&config).
		Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return helper.AdminRechargeGiftPolicy{}, nil
	}
	if err != nil {
		return helper.AdminRechargeGiftPolicy{}, fmt.Errorf("failed to get account config: %w", err)
	}
	var accountConfig types.AccountConfig
	if err := json.Unmarshal([]byte(config.Data), &accountConfig); err != nil {
		return helper.AdminRechargeGiftPolicy{}, fmt.Errorf(
			"failed to unmarshal account config: %w",
			err,
		)
	}
	return helper.AdminRechargeGiftPolicy{
		DefaultDiscountSteps:       intMapToStringMap(accountConfig.DefaultDiscountSteps),
		FirstRechargeDiscountSteps: intMapToStringMap(accountConfig.FirstRechargeDiscountSteps),
	}, nil
}

func intMapToStringMap(input map[int64]int64) map[string]int64 {
	output := make(map[string]int64, len(input))
	for key, value := range input {
		output[strconv.FormatInt(key, 10)] = value
	}
	return output
}

func (g *Cockroach) ListAdminRegions() ([]helper.AdminRegion, error) {
	regions, err := g.GetRegions()
	if err != nil {
		return nil, err
	}
	result := make([]helper.AdminRegion, len(regions))
	for i := range regions {
		result[i] = helper.AdminRegion{
			UID:         regions[i].UID,
			DisplayName: regions[i].DisplayName,
			Location:    regions[i].Location,
			Domain:      regions[i].Domain,
			Description: regions[i].Description,
		}
	}
	return result, nil
}
