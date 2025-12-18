package dao

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/common"
	"github.com/labring/sealos/service/account/helper"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/gorm"
)

type Interface interface {
	GetGlobalDB() *gorm.DB
	GetBillingHistoryNamespaceList(req *helper.NamespaceBillingHistoryReq) ([][]string, error)
	GetAccountWithWorkspace(workspace string) (*types.Account, error)
	GetProperties() ([]common.PropertyQuery, error)
	GetCosts(req helper.ConsumptionRecordReq) (common.TimeCostsMap, error)
	GetAppCosts(req *helper.AppCostsReq) (*common.AppCosts, error)
	GetAppResourceCosts(req *helper.AppCostsReq) (*helper.AppResourceCostsResponse, error)
	GetWorkspaceAPPCosts(req *helper.AppCostsReq) (*helper.WorkspaceAppCostsResponse, error)
	ChargeBilling(req *helper.AdminChargeBillingReq) error
	GetAppCostTimeRange(req helper.GetCostAppListReq) (helper.TimeRange, error)
	GetCostOverview(req helper.GetCostAppListReq) (helper.CostOverviewResp, error)
	GetBasicCostDistribution(req helper.GetCostAppListReq) (map[string]int64, error)
	GetCostAppList(req helper.GetCostAppListReq) (helper.CostAppListResp, error)
	Disconnect(ctx context.Context) error
	GetConsumptionAmount(req helper.ConsumptionRecordReq) (int64, error)
	GetWorkspaceConsumptionAmount(req helper.ConsumptionRecordReq) (map[string]int64, error)
	GetRechargeAmount(ops types.UserQueryOpts, startTime, endTime time.Time) (int64, error)
	GetPropertiesUsedAmount(user string, startTime, endTime time.Time) (map[string]int64, error)
	GetAccount(ops types.UserQueryOpts) (*types.Account, error)
	GetPayment(
		ops *types.UserQueryOpts,
		req *helper.GetPaymentReq,
	) ([]types.Payment, types.LimitResp, error)
	GetMonitorUniqueValues(
		startTime, endTime time.Time,
		namespaces []string,
	) ([]common.Monitor, error)
	ApplyInvoice(
		req *helper.ApplyInvoiceReq,
	) (invoice types.Invoice, payments []types.Payment, err error)
	GetInvoice(req *helper.GetInvoiceReq) ([]types.Invoice, types.LimitResp, error)
	GetInvoicePayments(invoiceID string) ([]types.Payment, error)
	SetStatusInvoice(req *helper.SetInvoiceStatusReq) error
	GetWorkspaceName(namespaces []string) ([][]string, error)
	SetPaymentInvoice(req *helper.SetPaymentInvoiceReq) error
	CreatePaymentOrder(order *types.PaymentOrder) error
	SetPaymentOrderStatusWithTradeNo(status types.PaymentOrderStatus, orderID string) error
	Transfer(req *helper.TransferAmountReq) error
	GetTransfer(ops *types.GetTransfersReq) (*types.GetTransfersResp, error)
	GetUserID(ops types.UserQueryOpts) (string, error)
	GetUserCrName(ops types.UserQueryOpts) (string, error)
	GetWorkspaceUserUID(workspace string) (uuid.UUID, error)
	GetNotificationRecipient(userUID uuid.UUID) (*types.NotificationRecipient, error)
	GetRegions() ([]types.Region, error)
	GetLocalRegion() types.Region
	UseGiftCode(req *helper.UseGiftCodeReq) (*types.GiftCode, error)
	GetRechargeDiscount(req helper.AuthReq) (helper.RechargeDiscountResp, error)
	ProcessPendingTaskRewards() error
	GetUserRealNameInfo(req *helper.GetRealNameInfoReq) (*types.UserRealNameInfo, error)
	GetEnterpriseRealNameInfo(req *helper.GetRealNameInfoReq) (*types.EnterpriseRealNameInfo, error)
	ReconcileUnsettledLLMBilling(startTime, endTime time.Time) error
	ReconcileActiveBilling(startTime, endTime time.Time) error
	ArchiveHourlyBilling(hourStart, hourEnd time.Time) error
	ActiveBilling(req resources.ActiveBilling) error
	GetCockroach() *cockroach.Cockroach
	SetCardInfo(info *types.CardInfo) (uuid.UUID, error)
	GetCardInfo(cardID, userUID uuid.UUID) (*types.CardInfo, error)
	GetAllCardInfo(ops *types.UserQueryOpts) ([]types.CardInfo, error)
	PaymentWithFunc(payment *types.Payment, preDo, postDo func(tx *gorm.DB) error) error
	NewCardPaymentHandler(paymentRequestID string, card types.CardInfo) (uuid.UUID, error)
	NewCardSubscriptionPaymentHandler(
		paymentRequestID string,
		card types.CardInfo,
	) (uuid.UUID, error)
	NewCardSubscriptionPaymentFailureHandler(paymentRequestID string) (uuid.UUID, error)
	NewCardPaymentFailureHandler(paymentRequestID string) (uuid.UUID, error)
	GetSubscription(ops *types.UserQueryOpts) (*types.Subscription, error)
	GetAvailableCredits(ops *types.UserQueryOpts) ([]types.Credits, error)
	GetSubscriptionPlanList() ([]types.SubscriptionPlan, error)
	GetLastSubscriptionTransaction(userUID uuid.UUID) (*types.SubscriptionTransaction, error)
	GetCardList(ops *types.UserQueryOpts) ([]types.CardInfo, error)
	DeleteCardInfo(id, userUID uuid.UUID) error
	SetDefaultCard(cardID, userUID uuid.UUID) error
	GlobalTransactionHandler(funcs ...func(tx *gorm.DB) error) error
	GetSubscriptionPlan(planName string) (*types.SubscriptionPlan, error)
	RefundAmount(ref types.PaymentRefund, postDo func(types.PaymentRefund) error) error
	CreateCorporate(corporate types.Corporate) error
	GetPaymentStatus(payID string) (types.PaymentStatus, error)

	// UserAlertNotificationAccount methods
	CreateUserAlertNotificationAccount(account *types.UserAlertNotificationAccount) error
	ListUserAlertNotificationAccounts(userUID uuid.UUID) ([]*types.UserAlertNotificationAccount, error)
	DeleteUserAlertNotificationAccounts(ids []uuid.UUID, userUID uuid.UUID) (int, []string, error)
	ToggleUserAlertNotificationAccounts(ids []uuid.UUID, isEnabled bool) (int, []string, error)

	GetUserWorkspaceRole(userUID uuid.UUID, workspace string) (types.Role, error)
	// WorkspaceSubscription methods
	GetWorkspaceSubscription(workspace, regionDomain string) (*types.WorkspaceSubscription, error)
	GetWorkspaceSubscriptionTraffic(workspace, regionDomain string) (total, used int64, err error)
	GetAIQuota(workspace, regionDomain string) (total, used int64, err error)
	ListWorkspaceSubscription(userUID uuid.UUID) ([]types.WorkspaceSubscription, error)
	ListWorkspaceSubscriptionWorkspace(userUID uuid.UUID) ([]string, error)
	GetWorkspaceSubscriptionPlanList() ([]types.WorkspaceSubscriptionPlan, error)
	GetWorkspaceSubscriptionPlan(planName string) (*types.WorkspaceSubscriptionPlan, error)
	GetWorkspaceSubscriptionPlanPrice(
		planName string,
		period types.SubscriptionPeriod,
	) (*types.ProductPrice, error)
	GetLastWorkspaceSubscriptionTransaction(
		workspace, regionDomain string,
	) (*types.WorkspaceSubscriptionTransaction, error)
	GetAllUnprocessedWorkspaceSubscriptionTransaction(
		userUID uuid.UUID,
	) ([]types.WorkspaceSubscriptionTransaction, error)
	GetWorkspaceSubscriptionPaymentAmount(userUID uuid.UUID, workspace string) (int64, error)
	CreateWorkspaceSubscriptionTransaction(
		tx *gorm.DB,
		transaction ...*types.WorkspaceSubscriptionTransaction,
	) error
	GetUserStripeCustomerID(userUID uuid.UUID) (string, error)
	ListWorkspaceSubscriptionsWithPagination(
		conditions map[string]any,
		pageIndex, pageSize int,
	) ([]types.WorkspaceSubscription, int64, error)
	GetWorkspaceRemainingAIQuota(workspace string) (totalQuota, remainingQuota int64, err error)
	ChargeWorkspaceAIQuota(usage int64, workspace string) error
}

type Account struct {
	*MongoDB
	*Cockroach
}

type MongoDB struct {
	Client            *mongo.Client
	AccountDBName     string
	BillingConn       string
	ActiveBillingConn string
	PropertiesConn    string
	Properties        *resources.PropertyTypeLS
}

type Cockroach struct {
	ck                   *cockroach.Cockroach
	subscriptionPlanList []types.SubscriptionPlan
}

func (g *Cockroach) GetCockroach() *cockroach.Cockroach {
	return g.ck
}

func (g *Cockroach) GetGlobalDB() *gorm.DB {
	return g.ck.GetGlobalDB()
}

func (g *Cockroach) GlobalTransactionHandler(funcs ...func(tx *gorm.DB) error) error {
	return g.ck.GlobalTransactionHandler(funcs...)
}

func (g *Cockroach) GetAccount(ops types.UserQueryOpts) (*types.Account, error) {
	account, err := g.ck.GetAccount(&ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}
	return account, nil
}

func (g *Cockroach) GetNotificationRecipient(
	userUID uuid.UUID,
) (*types.NotificationRecipient, error) {
	return g.ck.GetNotificationRecipient(userUID)
}

func (g *Cockroach) GetAccountWithWorkspace(workspace string) (*types.Account, error) {
	return g.ck.GetAccountWithWorkspace(workspace)
}

func (g *Cockroach) GetWorkspaceRemainingAIQuota(
	workspace string,
) (totalQuota, remainingQuota int64, err error) {
	// WorkspaceAIQuotaPackage
	var pkgs []types.WorkspaceAIQuotaPackage
	err = g.ck.GetGlobalDB().
		Model(&types.WorkspaceAIQuotaPackage{}).
		Where("workspace = ? AND expired_at > ? AND status = ?", workspace, time.Now(), types.PackageStatusActive).
		Find(&pkgs).
		Error
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get workspace ai quota package: %w", err)
	}
	for _, pkg := range pkgs {
		totalQuota += pkg.Total
		remainingQuota += pkg.Total - pkg.Usage
	}
	return totalQuota, remainingQuota, nil
}

func (g *Cockroach) ChargeWorkspaceAIQuota(usage int64, workspace string) error {
	err := g.ck.GetGlobalDB().Transaction(func(db *gorm.DB) error {
		var pkgs []types.WorkspaceAIQuotaPackage
		err := db.Model(&types.WorkspaceAIQuotaPackage{}).
			Where("workspace = ? AND expired_at > ? AND status = ?", workspace, time.Now(), types.PackageStatusActive).
			Order("expired_at asc").
			Find(&pkgs).
			Error
		if err != nil {
			return fmt.Errorf("failed to get workspace ai quota package: %w", err)
		}
		if len(pkgs) == 0 {
			return fmt.Errorf("no active ai quota package found for workspace: %s", workspace)
		}
		for _, pkg := range pkgs {
			available := pkg.Total - pkg.Usage
			if available <= 0 {
				continue
			}
			toDeduct := usage
			if available < usage {
				toDeduct = available
			}
			err = db.Model(&types.WorkspaceAIQuotaPackage{}).
				Where("id = ?", pkg.ID).
				UpdateColumn("usage", gorm.Expr("usage + ?", toDeduct)).
				Error
			if err != nil {
				return fmt.Errorf("failed to update usage for package %s: %w", pkg.ID, err)
			}
			usage -= toDeduct
			if usage <= 0 {
				break
			}
		}
		if usage > 0 {
			logrus.Errorf("insufficient AI quota in workspace: %s", workspace)
		}
		return nil
	})
	return err
}

func (g *Cockroach) GetPaymentStatus(payID string) (types.PaymentStatus, error) {
	payment, err := g.ck.GetPaymentWithID(payID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			paymentOrder, err := g.ck.GetPaymentOrderWithID(payID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return "", fmt.Errorf("no payment found with id: %s", payID)
				}
				return "", fmt.Errorf("failed to get payment order with id: %w", err)
			}
			return types.PaymentStatus(paymentOrder.Status), nil
		}
		return "", fmt.Errorf("failed to get payment with id: %w", err)
	}
	return payment.Status, nil
}

func (g *Cockroach) GetWorkspaceName(namespaces []string) ([][]string, error) {
	workspaceList := make([][]string, 0)
	workspaces, err := g.ck.GetWorkspace(namespaces...)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}
	for _, workspace := range workspaces {
		workspaceList = append(workspaceList, []string{workspace.ID, workspace.DisplayName})
	}
	return workspaceList, nil
}

func (g *Cockroach) GetUserID(ops types.UserQueryOpts) (string, error) {
	user, err := g.ck.GetUser(&ops)
	if err != nil {
		return "", fmt.Errorf("failed to get user: %w", err)
	}
	return user.ID, nil
}

func (g *Cockroach) GetUserCrName(ops types.UserQueryOpts) (string, error) {
	user, err := g.ck.GetUserCr(&ops)
	if err != nil {
		return "", err
	}
	return user.CrName, nil
}

func (g *Cockroach) GetWorkspaceUserUID(workspace string) (uuid.UUID, error) {
	db := g.ck.GetLocalDB()
	var userUID struct {
		UID uuid.UUID `gorm:"column:userUid"`
	}
	err := db.Model(&types.RegionUserCr{}).
		Select(`"UserCr"."userUid"`).
		Joins(`INNER JOIN "UserWorkspace" ON "UserCr".uid = "UserWorkspace"."userCrUid"`).
		Joins(`INNER JOIN "Workspace" ON "UserWorkspace"."workspaceUid" = "Workspace".uid`).
		Where(`"Workspace".id = ? AND "UserWorkspace".role = ?`, workspace, "OWNER").
		Scan(&userUID).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.UUID{}, fmt.Errorf("failed to query user uid: %w", err)
		}
	}
	return userUID.UID, err
}

func (g *Cockroach) GetUserWorkspaceRole(userUID uuid.UUID, workspace string) (types.Role, error) {
	db := g.ck.GetLocalDB()
	var role struct {
		Role types.Role `gorm:"column:role"`
	}
	err := db.Model(&types.RegionUserCr{}).
		Select(`"UserWorkspace".role`).
		Joins(`INNER JOIN "UserWorkspace" ON "UserCr".uid = "UserWorkspace"."userCrUid"`).
		Joins(`INNER JOIN "Workspace" ON "UserWorkspace"."workspaceUid" = "Workspace".uid`).
		Where(`"UserCr"."userUid" = ? AND "Workspace".id = ?`, userUID, workspace).
		Scan(&role).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return "", fmt.Errorf("failed to query user role: %w", err)
		}
		logrus.Warnf("no role found for user %s in workspace %s", userUID.String(), workspace)
		return "", nil
	}
	return role.Role, nil
}

func (g *Cockroach) GetPayment(
	ops *types.UserQueryOpts,
	req *helper.GetPaymentReq,
) ([]types.Payment, types.LimitResp, error) {
	if req.PaymentID != "" {
		payment, err := g.ck.GetPaymentWithID(req.PaymentID)
		if err != nil {
			return nil, types.LimitResp{}, fmt.Errorf("failed to get payment with id: %w", err)
		}
		return []types.Payment{*payment}, types.LimitResp{Total: 1, TotalPage: 1}, nil
	}
	return g.ck.GetPaymentWithLimit(ops, types.LimitReq{
		Page:     req.Page,
		PageSize: req.PageSize,
		TimeRange: types.TimeRange{
			StartTime: req.StartTime,
			EndTime:   req.EndTime,
		},
	}, req.Invoiced)
}

func (g *Cockroach) CreatePayment(req *types.Payment) error {
	return g.ck.Payment(req)
}

func (g *Cockroach) SetPaymentInvoice(req *helper.SetPaymentInvoiceReq) error {
	return g.ck.SetPaymentInvoice(&types.UserQueryOpts{Owner: req.Owner}, req.PaymentIDList)
}

func (g *Cockroach) CreatePaymentOrder(order *types.PaymentOrder) error {
	return g.ck.CreatePaymentOrder(order)
}

func (g *Cockroach) SetPaymentOrderStatusWithTradeNo(
	status types.PaymentOrderStatus,
	orderID string,
) error {
	return g.ck.SetPaymentOrderStatusWithTradeNo(status, orderID)
}

func (g *Cockroach) PaymentWithFunc(
	payment *types.Payment,
	preDo, postDo func(tx *gorm.DB) error,
) error {
	return g.ck.PaymentWithFunc(payment, preDo, postDo)
}

func (g *Cockroach) SetCardInfo(info *types.CardInfo) (uuid.UUID, error) {
	return g.ck.SetCardInfo(info)
}

func (g *Cockroach) GetCardInfo(cardID, userUID uuid.UUID) (*types.CardInfo, error) {
	return g.ck.GetCardInfo(cardID, userUID)
}

func (g *Cockroach) GetAllCardInfo(ops *types.UserQueryOpts) ([]types.CardInfo, error) {
	return g.ck.GetAllCardInfo(ops)
}

func (g *Cockroach) GetSubscription(ops *types.UserQueryOpts) (*types.Subscription, error) {
	return g.ck.GetSubscription(ops)
}

func (g *Cockroach) GetAvailableCredits(ops *types.UserQueryOpts) ([]types.Credits, error) {
	return g.ck.GetAvailableCredits(ops)
}

func (g *Cockroach) GetSubscriptionPlanList() ([]types.SubscriptionPlan, error) {
	var err error
	if len(g.subscriptionPlanList) == 0 {
		g.subscriptionPlanList, err = g.ck.GetSubscriptionPlanList()
	}
	return g.subscriptionPlanList, err
}

func (g *Cockroach) GetLastSubscriptionTransaction(
	userUID uuid.UUID,
) (*types.SubscriptionTransaction, error) {
	return GetLastSubscriptionTransaction(g.ck.GetGlobalDB(), userUID)
}

func GetLastSubscriptionTransaction(
	db *gorm.DB,
	userUID uuid.UUID,
) (*types.SubscriptionTransaction, error) {
	transaction := &types.SubscriptionTransaction{}
	err := db.Where("user_uid = ?", userUID).Order("created_at desc").First(transaction).Error
	if err != nil {
		return nil, err
	}
	return transaction, nil
}

func (g *Cockroach) NewCardPaymentHandler(
	paymentRequestID string,
	card types.CardInfo,
) (uuid.UUID, error) {
	order, err := g.ck.GetPaymentOrderWithTradeNo(paymentRequestID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to get payment order with trade no: %w", err)
	}
	if order.Status != types.PaymentOrderStatusPending {
		// fmt.Printf("payment order status is not pending: %v\n", order)
		return uuid.Nil, ErrPaymentOrderAlreadyHandle
		// return fmt.Errorf("payment order status is not pending: %v", order)
	}
	if card.ID == uuid.Nil {
		card.ID = uuid.New()
	}
	card.UserUID = order.UserUID
	order.ChargeSource = types.ChargeSourceNewCard
	// TODO
	err = g.ck.PaymentWithFunc(&types.Payment{
		ID:         order.ID,
		PaymentRaw: order.PaymentRaw,
	}, func(tx *gorm.DB) error {
		if card.CardToken != "" {
			card.ID, err = cockroach.SetCardInfo(tx, &card)
			if err != nil {
				return fmt.Errorf("failed to set card info: %w", err)
			}
			order.CardUID = &card.ID
		}
		return nil
	}, func(tx *gorm.DB) error {
		return cockroach.SetPaymentOrderStatusWithTradeNo(
			tx,
			types.PaymentOrderStatusSuccess,
			order.TradeNO,
		)
	})
	return order.UserUID, err
}

func (g *Cockroach) NewCardPaymentFailureHandler(paymentRequestID string) (uuid.UUID, error) {
	order, err := g.ck.GetPaymentOrderWithTradeNo(paymentRequestID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to get payment order with trade no: %w", err)
	}
	if order.Status == types.PaymentOrderStatusFailed {
		return uuid.Nil, nil
	}
	if order.Status != types.PaymentOrderStatusPending {
		fmt.Printf("payment order status is not pending: %v\n", order)
		return uuid.Nil, nil
	}
	return order.UserUID, g.ck.SetPaymentOrderStatusWithTradeNo(
		types.PaymentOrderStatusFailed,
		order.TradeNO,
	)
}

var ErrPaymentOrderAlreadyHandle = errors.New("payment order already handle")

func (g *Cockroach) NewCardSubscriptionPaymentHandler(
	paymentRequestID string,
	card types.CardInfo,
) (uuid.UUID, error) {
	if paymentRequestID == "" {
		return uuid.Nil, errors.New("payment request id is empty")
	}
	var userUID uuid.UUID
	err := g.ck.GlobalTransactionHandler(func(tx *gorm.DB) error {
		order, err := g.ck.GetPaymentOrderWithTradeNo(paymentRequestID)
		if err != nil {
			return fmt.Errorf("failed to get payment order with trade no: %w", err)
		}
		userUID = order.UserUID
		if order.Status != types.PaymentOrderStatusPending {
			return ErrPaymentOrderAlreadyHandle
		}
		if card.CardToken != "" {
			card.UserUID = order.UserUID
			card.ID, err = cockroach.SetCardInfo(tx, &card)
			if err != nil {
				return fmt.Errorf("failed to set card info: %w", err)
			}
		}
		order.CardUID = &card.ID
		order.ChargeSource = types.ChargeSourceNewCard
		// TODO List
		// 1. set payment order status with tradeNo
		// 2. save success payment
		// 3. set transaction pay status to paid
		// 4. save card info
		err = cockroach.SetPaymentOrderStatusWithTradeNo(
			tx,
			types.PaymentOrderStatusSuccess,
			order.TradeNO,
		)
		if err != nil {
			return fmt.Errorf("failed to set payment order status: %w", err)
		}
		if err = tx.Model(&types.Payment{}).Create(&types.Payment{
			ID:         order.ID,
			PaymentRaw: order.PaymentRaw,
		}).Error; err != nil {
			return fmt.Errorf("failed to save payment: %w", err)
		}
		if err = tx.Model(&types.SubscriptionTransaction{}).Where(&types.SubscriptionTransaction{PayID: order.ID}).Update("pay_status", types.SubscriptionPayStatusPaid).Error; err != nil {
			return fmt.Errorf("failed to update subscription transaction pay status: %w", err)
		}
		if err = tx.Model(&types.Subscription{}).Where(&types.Subscription{UserUID: order.UserUID}).Update("card_id", card.ID).Error; err != nil {
			return fmt.Errorf("failed to update subscription card id: %w", err)
		}
		return nil
	})
	return userUID, err
}

func (g *Cockroach) NewCardSubscriptionPaymentFailureHandler(
	paymentRequestID string,
) (uuid.UUID, error) {
	if paymentRequestID == "" {
		return uuid.Nil, errors.New("payment request id is empty")
	}
	var userUID uuid.UUID
	err := g.ck.GlobalTransactionHandler(func(tx *gorm.DB) error {
		order, err := g.ck.GetPaymentOrderWithTradeNo(paymentRequestID)
		if err != nil {
			return fmt.Errorf("failed to get payment order with trade no: %w", err)
		}
		userUID = order.UserUID
		if order.Status != types.PaymentOrderStatusPending {
			return nil
		}
		// 1. set payment order status with tradeNo
		// 2. set transaction pay status to failed
		err = cockroach.SetPaymentOrderStatusWithTradeNo(
			tx,
			types.PaymentOrderStatusFailed,
			order.TradeNO,
		)
		if err != nil {
			return fmt.Errorf("failed to set payment order status: %w", err)
		}
		if err = tx.Model(&types.SubscriptionTransaction{}).Where(&types.SubscriptionTransaction{PayID: order.ID}).Update("pay_status", types.SubscriptionPayStatusFailed).Update("status", types.SubscriptionTransactionStatusFailed).
			Error; err != nil {
			return fmt.Errorf("failed to update subscription transaction pay status: %w", err)
		}
		return nil
	})
	return userUID, err
}

func (g *Cockroach) GetCardList(ops *types.UserQueryOpts) ([]types.CardInfo, error) {
	return g.ck.GetCardList(ops)
}

func (g *Cockroach) DeleteCardInfo(id, userUID uuid.UUID) error {
	return g.ck.DeleteCardInfo(id, userUID)
}

func (g *Cockroach) SetDefaultCard(cardID, userUID uuid.UUID) error {
	return g.ck.SetDefaultCard(cardID, userUID)
}

func (g *Cockroach) Transfer(req *helper.TransferAmountReq) error {
	if req.TransferAll {
		return g.ck.TransferAccountAll(
			&types.UserQueryOpts{ID: req.UserID, Owner: req.Owner},
			&types.UserQueryOpts{ID: req.ToUser},
		)
	}
	return g.ck.TransferAccount(
		&types.UserQueryOpts{Owner: req.Owner, ID: req.UserID},
		&types.UserQueryOpts{ID: req.ToUser},
		req.Amount,
	)
}

func (g *Cockroach) GetTransfer(ops *types.GetTransfersReq) (*types.GetTransfersResp, error) {
	return g.ck.GetTransfer(ops)
}

func (g *Cockroach) GetRegions() ([]types.Region, error) {
	return g.ck.GetRegions()
}

func (g *Cockroach) GetSubscriptionPlan(planName string) (*types.SubscriptionPlan, error) {
	return g.ck.GetSubscriptionPlan(planName)
}

func (g *Cockroach) GetLocalRegion() types.Region {
	return g.ck.GetLocalRegion()
}

func (g *Cockroach) GetRechargeAmount(
	ops types.UserQueryOpts,
	startTime, endTime time.Time,
) (int64, error) {
	payment, err := g.ck.GetPayment(&ops, startTime, endTime)
	if err != nil {
		return 0, fmt.Errorf("failed to get payment: %w", err)
	}
	paymentAmount := int64(0)
	for i := range payment {
		paymentAmount += payment[i].Amount
	}
	return paymentAmount, nil
}

func (m *MongoDB) GetProperties() ([]common.PropertyQuery, error) {
	propertiesQuery := make([]common.PropertyQuery, 0)
	if m.Properties == nil {
		properties, err := m.getProperties()
		if err != nil {
			return nil, fmt.Errorf("get properties error: %w", err)
		}
		m.Properties = properties
	}
	for _, propertyType := range m.Properties.Types {
		property := common.PropertyQuery{
			Name:      propertyType.Name,
			UnitPrice: propertyType.UnitPrice,
			Unit:      propertyType.UnitString,
			Alias:     propertyType.Alias,
		}
		if propertyType.ViewPrice > 0 {
			property.UnitPrice = propertyType.ViewPrice
		}
		propertiesQuery = append(propertiesQuery, property)
	}
	return propertiesQuery, nil
}

func (m *MongoDB) GetCosts(req helper.ConsumptionRecordReq) (common.TimeCostsMap, error) {
	owner, startTime, endTime := req.Owner, req.StartTime, req.EndTime
	appType, appName := req.AppType, req.AppName

	timeMatchValue := bson.D{
		primitive.E{Key: "$gte", Value: startTime},
		primitive.E{Key: "$lte", Value: endTime},
	}
	matchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
		primitive.E{Key: "owner", Value: owner},
		primitive.E{Key: "type", Value: 0},
	}

	if appType != "" {
		matchValue = append(
			matchValue,
			primitive.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(appType)]},
		)
	}
	if req.Namespace != "" {
		matchValue = append(matchValue, primitive.E{Key: "namespace", Value: req.Namespace})
	}

	pipeline := bson.A{
		bson.D{primitive.E{Key: "$match", Value: matchValue}},
	}

	project := bson.D{
		primitive.E{Key: "time", Value: 1},
		primitive.E{Key: "amount", Value: 1},
	}
	if appType != "" && appName != "" && appType != resources.AppStore {
		pipeline = append(
			pipeline,
			bson.D{primitive.E{Key: "$unwind", Value: "$app_costs"}},
			bson.D{
				primitive.E{Key: "$match", Value: bson.D{{Key: "app_costs.name", Value: appName}}},
			},
		)
		project[1] = primitive.E{Key: "amount", Value: "$app_costs.amount"}
	}

	pipeline = append(pipeline,
		bson.D{primitive.E{Key: "$sort", Value: bson.D{{Key: "time", Value: 1}}}},
		bson.D{primitive.E{Key: "$project", Value: project}},
	)

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %w", err)
	}
	defer cursor.Close(context.Background())

	var accountBalanceList []struct {
		Time   time.Time `bson:"time"`
		Amount int64     `bson:"amount"`
	}

	if err := cursor.All(context.Background(), &accountBalanceList); err != nil {
		return nil, fmt.Errorf("failed to decode all billing records: %w", err)
	}

	costsMap := make(common.TimeCostsMap, len(accountBalanceList))
	for i := range accountBalanceList {
		costsMap[i] = append(costsMap[i], accountBalanceList[i].Time.Unix())
		costsMap[i] = append(costsMap[i], strconv.FormatInt(accountBalanceList[i].Amount, 10))
	}
	return costsMap, nil
}

func (m *Account) InitDB() error {
	if err := m.ck.InitTables(); err != nil {
		return fmt.Errorf("failed to init tables: %w", err)
	}
	return m.initTables()
}

func (m *MongoDB) initTables() error {
	if exist, err := m.collectionExist(m.AccountDBName, m.ActiveBillingConn); exist || err != nil {
		return err
	}
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "time", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(30 * 24 * 60 * 60),
	}
	_, err := m.getActiveBillingCollection().Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}
	return nil
}

func (m *MongoDB) collectionExist(dbName, collectionName string) (bool, error) {
	// Check if the collection already exists
	collections, err := m.Client.Database(dbName).
		ListCollectionNames(context.Background(), bson.M{"name": collectionName})
	return len(collections) > 0, err
}

func (m *MongoDB) SaveActiveBillings(billing ...*resources.ActiveBilling) error {
	billings := make([]any, len(billing))
	for i, b := range billing {
		billings[i] = b
	}
	_, err := m.getActiveBillingCollection().InsertMany(context.Background(), billings)
	return err
}

func (m *MongoDB) SaveBillings(billing ...*resources.Billing) error {
	billings := make([]any, len(billing))
	for i, b := range billing {
		billings[i] = b
	}
	_, err := m.getBillingCollection().InsertMany(context.Background(), billings)
	return err
}

// GetAppResourceCosts 获取指定时间范围内应用资源的使用情况和花费
func (m *MongoDB) GetAppResourceCosts(
	req *helper.AppCostsReq,
) (*helper.AppResourceCostsResponse, error) {
	appType := strings.ToUpper(req.AppType)
	result := &helper.AppResourceCostsResponse{
		AppType: appType,
	}
	result.ResourcesByType = map[string]*helper.ResourceUsage{
		appType: {
			Used:       make(map[uint8]int64),
			UsedAmount: make(map[uint8]int64),
			Count:      0,
		},
	}
	if appType == resources.AppStore {
		delete(result.ResourcesByType, appType)
	}
	matchConditions := bson.D{
		{Key: "owner", Value: req.Owner},
		{Key: "time", Value: bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		}},
	}
	if req.Namespace != "" {
		matchConditions = append(matchConditions, bson.E{Key: "namespace", Value: req.Namespace})
	}

	if strings.ToUpper(req.AppType) == resources.AppStore {
		if req.AppName != "" {
			matchConditions = append(matchConditions, bson.E{Key: "app_name", Value: req.AppName})
		}
		matchConditions = append(
			matchConditions,
			bson.E{Key: "app_type", Value: resources.AppType[resources.AppStore]},
		)

		cursor, err := m.getBillingCollection().Find(context.Background(), matchConditions)
		if err != nil {
			return nil, fmt.Errorf("failed to find billing collection: %w", err)
		}
		defer cursor.Close(context.Background())

		for cursor.Next(context.Background()) {
			var billing resources.Billing
			if err := cursor.Decode(&billing); err != nil {
				return nil, fmt.Errorf("failed to decode billing: %w", err)
			}
			appTypeMap := make(map[string]struct{})
			for _, appCost := range billing.AppCosts {
				appTypeStr := resources.AppTypeReverse[appCost.Type]
				if appTypeStr == "" {
					appTypeStr = "UNKNOWN"
				}
				if _, exists := result.ResourcesByType[appTypeStr]; !exists {
					result.ResourcesByType[appTypeStr] = &helper.ResourceUsage{
						Used:       make(map[uint8]int64),
						UsedAmount: make(map[uint8]int64),
						Count:      0,
					}
				}
				for k, v := range appCost.Used {
					result.ResourcesByType[appTypeStr].Used[k] += v
					result.ResourcesByType[appTypeStr].UsedAmount[k] += appCost.UsedAmount[k]
				}
				appTypeMap[appTypeStr] = struct{}{}
			}
			for _type := range appTypeMap {
				result.ResourcesByType[_type].Count++
			}
		}
		if err := cursor.Err(); err != nil {
			return nil, fmt.Errorf("failed to iterate cursor: %w", err)
		}
	} else {
		if req.AppType != "" {
			matchConditions = append(matchConditions, bson.E{Key: "app_type", Value: resources.AppType[appType]})
		}

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: matchConditions}},
			{{Key: "$unwind", Value: "$app_costs"}},
		}

		if req.AppName != "" {
			pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.D{{Key: "app_costs.name", Value: req.AppName}}}})
		}

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
		if err != nil {
			return nil, fmt.Errorf("failed to aggregate billing collection: %w", err)
		}
		defer cursor.Close(context.Background())

		for cursor.Next(context.Background()) {
			var resultDoc struct {
				AppCosts resources.AppCost `bson:"app_costs"`
			}
			if err := cursor.Decode(&resultDoc); err != nil {
				return nil, fmt.Errorf("failed to decode result doc: %w", err)
			}
			for resourceKey, usedValue := range resultDoc.AppCosts.Used {
				result.ResourcesByType[appType].Used[resourceKey] += usedValue
				result.ResourcesByType[appType].UsedAmount[resourceKey] += resultDoc.AppCosts.UsedAmount[resourceKey]
			}
			result.ResourcesByType[appType].Count++
		}
		if err := cursor.Err(); err != nil {
			return nil, fmt.Errorf("failed to iterate cursor: %w", err)
		}
	}
	for _, resourceUsage := range result.ResourcesByType {
		for k, v := range resourceUsage.Used {
			resourceUsage.Used[k] = v / int64(resourceUsage.Count)
		}
	}
	return result, nil
}

func (m *MongoDB) GetWorkspaceAPPCosts(
	req *helper.AppCostsReq,
) (*helper.WorkspaceAppCostsResponse, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}

	results := &helper.WorkspaceAppCostsResponse{
		CurrentPage: req.Page,
	}

	// 构建查询条件，组合成本和资源使用数据
	matchConditions := bson.D{
		{Key: "owner", Value: req.Owner},
		{Key: "status", Value: resources.Settled},
		{Key: "time", Value: bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		}},
	}

	if req.Namespace != "" {
		matchConditions = append(matchConditions, bson.E{Key: "namespace", Value: req.Namespace})
	}

	if req.AppType != "" {
		if strings.ToUpper(req.AppType) != resources.AppStore {
			matchConditions = append(
				matchConditions,
				bson.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(req.AppType)]},
			)
		} else {
			matchConditions = append(matchConditions, bson.E{Key: "app_type", Value: resources.AppType[resources.AppStore]})
		}
	}

	if req.AppName != "" {
		if req.AppType != "" && strings.ToUpper(req.AppType) != resources.AppStore {
			matchConditions = append(
				matchConditions,
				bson.E{Key: "app_costs.name", Value: req.AppName},
			)
		} else {
			matchConditions = append(matchConditions, bson.E{Key: "app_name", Value: req.AppName})
		}
	}

	// 构建聚合管道
	var pipeline mongo.Pipeline

	if req.AppType == "" || strings.ToUpper(req.AppType) != resources.AppStore {
		// 处理非AppStore类型的应用
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: matchConditions}},
			{{Key: "$unwind", Value: "$app_costs"}},
		}
		if req.AppName != "" {
			// matchConditions = append(matchConditions, bson.E{Key: "app_costs.name", Value: req.AppName})
			pipeline = append(
				pipeline,
				bson.D{{Key: "$match", Value: bson.D{{Key: "app_costs.name", Value: req.AppName}}}},
			)
		}

		pipeline = append(pipeline,
			bson.D{{Key: "$project", Value: bson.D{
				{Key: "app_name", Value: "$app_costs.name"},
				{Key: "app_type", Value: "$app_type"},
				{Key: "time", Value: 1},
				{Key: "order_id", Value: 1},
				{Key: "namespace", Value: 1},
				{Key: "amount", Value: "$app_costs.amount"},
				{Key: "used", Value: "$app_costs.used"},
				{Key: "used_amount", Value: "$app_costs.used_amount"},
			}}},
			bson.D{{Key: "$sort", Value: bson.D{
				{Key: "time", Value: -1},
				{Key: "app_name", Value: 1},
			}}},
		)
		// if req.AppName != "" && req.AppType != "" && strings.ToUpper(req.AppType) != resources.AppStore {
		//	pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.D{{Key: "app_costs.name", Value: req.AppName}}}})
		//}
	} else {
		// 处理AppStore类型的应用，需要累加app_costs中的used和used_amount
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: matchConditions}},
			{{Key: "$project", Value: bson.D{
				{Key: "app_name", Value: 1},
				{Key: "app_type", Value: 1},
				{Key: "time", Value: 1},
				{Key: "order_id", Value: 1},
				{Key: "namespace", Value: 1},
				{Key: "amount", Value: 1},
				{Key: "app_costs", Value: 1}, // 保留app_costs用于后续处理
			}}},
			{{Key: "$sort", Value: bson.D{
				{Key: "time", Value: -1},
				{Key: "app_name", Value: 1},
			}}},
		}
	}

	// 分页处理
	skip := (req.Page - 1) * req.PageSize
	pipeline = append(pipeline,
		bson.D{{Key: "$facet", Value: bson.D{
			{Key: "totalRecords", Value: bson.A{
				bson.D{{Key: "$count", Value: "count"}},
			}},
			{Key: "costs", Value: bson.A{
				bson.D{{Key: "$skip", Value: skip}},
				bson.D{{Key: "$limit", Value: req.PageSize}},
			}},
		}}},
	)

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %w", err)
	}
	defer cursor.Close(context.Background())

	var pipelineResult struct {
		TotalRecords []struct {
			Count int `bson:"count"`
		} `bson:"totalRecords"`
		Costs []struct {
			AppName    string           `bson:"app_name"`
			AppType    int32            `bson:"app_type"`
			Time       time.Time        `bson:"time"`
			OrderID    string           `bson:"order_id"`
			Namespace  string           `bson:"namespace"`
			Amount     int64            `bson:"amount"`
			Used       map[string]int64 `bson:"used"`
			UsedAmount map[string]int64 `bson:"used_amount"`
			AppCosts   []struct {
				Type       uint8            `bson:"type"`
				Name       string           `bson:"name"`
				Amount     int64            `bson:"amount"`
				Used       map[string]int64 `bson:"used"`
				UsedAmount map[string]int64 `bson:"used_amount"`
			} `bson:"app_costs,omitempty"` // 用于AppStore类型
		} `bson:"costs"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&pipelineResult); err != nil {
			return nil, fmt.Errorf("failed to decode result: %w", err)
		}
	}

	// 设置总记录数和总页数
	if len(pipelineResult.TotalRecords) > 0 {
		results.TotalRecords = pipelineResult.TotalRecords[0].Count
	}
	results.TotalPages = (results.TotalRecords + req.PageSize - 1) / req.PageSize

	// 转换结果并构建资源使用情况
	for _, cost := range pipelineResult.Costs {
		workspaceCost := helper.WorkspaceAppCostWithResources{
			AppName:   cost.AppName,
			AppType:   cost.AppType,
			Time:      cost.Time,
			OrderID:   cost.OrderID,
			Namespace: cost.Namespace,
			Amount:    cost.Amount,
		}

		var resourcesByType []helper.AppCostDetail

		// 判断是否为AppStore类型
		appTypeStr := resources.AppTypeReverse[uint8(cost.AppType)] // #nosec G115
		if appTypeStr == resources.AppStore && len(cost.AppCosts) > 0 {
			// AppStore类型：展开app_costs数组，每个app_cost作为一个独立的资源项
			for _, appCost := range cost.AppCosts {
				detail := helper.AppCostDetail{
					AppType:    appCost.Type,
					AppName:    appCost.Name,
					Amount:     appCost.Amount,
					Used:       make(map[uint8]int64),
					UsedAmount: make(map[uint8]int64),
				}

				// 转换used数据
				for strKey, value := range appCost.Used {
					if key, err := strconv.ParseUint(strKey, 10, 8); err == nil {
						detail.Used[uint8(key)] = value
					}
				}

				// 转换used_amount数据
				for strKey, value := range appCost.UsedAmount {
					if key, err := strconv.ParseUint(strKey, 10, 8); err == nil {
						detail.UsedAmount[uint8(key)] = value
					}
				}

				resourcesByType = append(resourcesByType, detail)
			}
		} else {
			// 非AppStore类型：创建单个资源项
			detail := helper.AppCostDetail{
				AppType:    uint8(cost.AppType), // #nosec G115
				AppName:    cost.AppName,
				Amount:     cost.Amount,
				Used:       make(map[uint8]int64),
				UsedAmount: make(map[uint8]int64),
			}

			// 转换used数据
			for strKey, value := range cost.Used {
				if key, err := strconv.ParseUint(strKey, 10, 8); err == nil {
					detail.Used[uint8(key)] = value
				}
			}

			// 转换used_amount数据
			for strKey, value := range cost.UsedAmount {
				if key, err := strconv.ParseUint(strKey, 10, 8); err == nil {
					detail.UsedAmount[uint8(key)] = value
				}
			}

			resourcesByType = append(resourcesByType, detail)
		}

		workspaceCost.ResourcesByType = resourcesByType
		results.Costs = append(results.Costs, workspaceCost)
	}

	return results, nil
}

func (m *MongoDB) GetAppCosts(req *helper.AppCostsReq) (results *common.AppCosts, rErr error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	pageSize := req.PageSize
	results = &common.AppCosts{
		CurrentPage: req.Page,
	}
	if req.OrderID != "" {
		costs, err := m.GetAppCostsByOrderIDAndAppName(req)
		if err != nil {
			rErr = fmt.Errorf("failed to get app costs by order id and app name: %w", err)
			return results, rErr
		}
		results.Costs = costs
		results.TotalRecords = len(costs)
		results.TotalPages = 1
		return results, rErr
	}

	timeMatch := bson.E{
		Key:   "time",
		Value: bson.D{{Key: "$gte", Value: req.StartTime}, {Key: "$lte", Value: req.EndTime}},
	}

	matchConditions := bson.D{timeMatch}
	matchConditions = append(
		matchConditions,
		bson.E{Key: "owner", Value: req.Owner},
		bson.E{Key: "status", Value: resources.Settled},
	)
	if req.AppName != "" && req.AppType != "" {
		if strings.ToUpper(req.AppType) != resources.AppStore {
			matchConditions = append(
				matchConditions,
				bson.E{Key: "app_costs.name", Value: req.AppName},
			)
		} else {
			matchConditions = append(matchConditions, bson.E{Key: "app_name", Value: req.AppName})
		}
	}
	if req.Namespace != "" {
		matchConditions = append(matchConditions, bson.E{Key: "namespace", Value: req.Namespace})
	}

	if strings.ToUpper(req.AppType) != resources.AppStore {
		match := make(bson.D, len(matchConditions))
		copy(match, matchConditions[:])
		if req.AppType != "" {
			match = append(
				match,
				bson.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(req.AppType)]},
			)
		} else {
			match = append(match, bson.E{Key: "app_type", Value: bson.M{"$ne": resources.AppType[resources.AppStore]}})
		}
		if req.OrderID != "" {
			match = bson.D{
				{Key: "order_id", Value: req.OrderID},
				{Key: "owner", Value: req.Owner},
			}
		}
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: match}},
			{{Key: "$facet", Value: bson.D{
				{Key: "withAppCosts", Value: bson.A{
					bson.D{
						{
							Key:   "$match",
							Value: bson.D{{Key: "app_costs", Value: bson.M{"$exists": true}}},
						},
					},
					bson.D{{Key: "$unwind", Value: "$app_costs"}},
					bson.D{{Key: "$match", Value: matchConditions}},
					bson.D{{Key: "$project", Value: bson.D{
						{Key: "time", Value: 1},
						{Key: "order_id", Value: 1},
						{Key: "namespace", Value: 1},
						{Key: "used", Value: "$app_costs.used"},
						{Key: "used_amount", Value: "$app_costs.used_amount"},
						{Key: "amount", Value: "$app_costs.amount"},
						{Key: "app_name", Value: "$app_costs.name"},
						{Key: "app_type", Value: "$app_type"},
					}}},
				}},
				{Key: "withoutAppCosts", Value: bson.A{
					bson.D{{Key: "$match", Value: bson.D{
						{Key: "app_costs", Value: bson.M{"$exists": false}},
						{Key: "app_name", Value: bson.M{"$exists": true}},
					}}},
					bson.D{{Key: "$match", Value: matchConditions}},
					bson.D{{Key: "$project", Value: bson.D{
						{Key: "time", Value: 1},
						{Key: "order_id", Value: 1},
						{Key: "namespace", Value: 1},
						{Key: "used", Value: nil},
						{Key: "used_amount", Value: nil},
						{Key: "amount", Value: 1},
						{Key: "app_name", Value: 1},
						{Key: "app_type", Value: 1},
					}}},
				}},
			}}},
			{{Key: "$project", Value: bson.D{
				{
					Key: "combined",
					Value: bson.D{
						{Key: "$concatArrays", Value: bson.A{"$withAppCosts", "$withoutAppCosts"}},
					},
				},
			}}},
			{{Key: "$unwind", Value: "$combined"}},
			{{Key: "$replaceRoot", Value: bson.D{{Key: "newRoot", Value: "$combined"}}}},
			{{Key: "$sort", Value: bson.D{
				{Key: "time", Value: -1},
				{Key: "app_name", Value: 1},
				{Key: "_id", Value: 1},
			}}},
			{{Key: "$facet", Value: bson.D{
				{Key: "totalRecords", Value: bson.A{
					bson.D{{Key: "$count", Value: "count"}},
				}},
				{Key: "costs", Value: bson.A{
					bson.D{{Key: "$skip", Value: (req.Page - 1) * pageSize}},
					bson.D{{Key: "$limit", Value: pageSize}},
				}},
			}}},
			{{Key: "$project", Value: bson.D{
				{
					Key:   "total_records",
					Value: bson.D{{Key: "$arrayElemAt", Value: bson.A{"$totalRecords.count", 0}}},
				},
				{
					Key: "total_pages",
					Value: bson.D{
						{
							Key: "$ceil",
							Value: bson.D{
								{
									Key: "$divide",
									Value: bson.A{
										bson.D{
											{
												Key:   "$arrayElemAt",
												Value: bson.A{"$totalRecords.count", 0},
											},
										},
										pageSize,
									},
								},
							},
						},
					},
				},
				{Key: "costs", Value: 1},
			}}},
		}

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
		if err != nil {
			return nil, fmt.Errorf("failed to aggregate billing collection: %w", err)
		}
		if cursor.Next(context.Background()) {
			if err := cursor.Decode(results); err != nil {
				return nil, fmt.Errorf("failed to decode result: %w", err)
			}
		}
	}

	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		matchConditions = append(
			matchConditions,
			bson.E{Key: "app_type", Value: resources.AppType[resources.AppStore]},
		)
		appStoreTotal, err := m.getAppStoreCostsTotal(req)
		if err != nil {
			rErr = fmt.Errorf("failed to get app store costs total: %w", err)
			return results, rErr
		}
		currentAppPageIsFull := len(results.Costs) == pageSize
		maxAppPageSize := (results.TotalRecords + pageSize - 1) / pageSize
		completedNum := calculateComplement(results.TotalRecords, pageSize)

		if req.Page == maxAppPageSize {
			if !currentAppPageIsFull {
				appStoreCost, err := m.getAppStoreCosts(matchConditions, 0, completedNum)
				if err != nil {
					rErr = fmt.Errorf("failed to get app store costs: %w", err)
					return results, rErr
				}
				results.Costs = append(results.Costs, appStoreCost.Costs...)
			}
		} else if req.Page > maxAppPageSize {
			skipPageSize := (req.Page - maxAppPageSize - 1) * pageSize
			if skipPageSize < 0 {
				skipPageSize = 0
			}
			appStoreCost, err := m.getAppStoreCosts(matchConditions, completedNum+skipPageSize, req.PageSize)
			if err != nil {
				rErr = fmt.Errorf("failed to get app store costs: %w", err)
				return results, rErr
			}
			results.Costs = append(results.Costs, appStoreCost.Costs...)
		}
		results.TotalRecords += int(appStoreTotal)
	}
	results.TotalPages = (results.TotalRecords + pageSize - 1) / pageSize
	return results, nil
}

func (m *MongoDB) getAppStoreCostsTotal(req *helper.AppCostsReq) (int64, error) {
	matchConditions := bson.D{
		{Key: "owner", Value: req.Owner},
		{Key: "app_type", Value: resources.AppType[resources.AppStore]},
	}
	if req.AppName != "" {
		matchConditions = append(matchConditions, bson.E{Key: "app_costs.name", Value: req.AppName})
	}
	if req.Namespace != "" {
		matchConditions = append(matchConditions, bson.E{Key: "namespace", Value: req.Namespace})
	}
	matchConditions = append(matchConditions, bson.E{Key: "time", Value: bson.M{
		"$gte": req.StartTime,
		"$lte": req.EndTime,
	}})
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchConditions}},
		{{Key: "$count", Value: "total_records"}},
	}
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to aggregate billing collection: %w", err)
	}
	defer cursor.Close(context.Background())
	var result struct {
		TotalRecords int64 `bson:"total_records"`
	}
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode result: %w", err)
		}
	}
	return result.TotalRecords, nil
}

func (m *MongoDB) GetAppCostsByOrderIDAndAppName(
	req *helper.AppCostsReq,
) ([]common.AppCost, error) {
	var pipeline mongo.Pipeline
	if req.AppType == resources.AppStore {
		pipeline = mongo.Pipeline{
			{
				{
					Key: "$match",
					Value: bson.D{
						{Key: "order_id", Value: req.OrderID},
						{Key: "owner", Value: req.Owner},
					},
				},
			},
			{{Key: "$unwind", Value: "$app_costs"}},
			{{Key: "$project", Value: bson.D{
				{Key: "app_name", Value: "$app_costs.name"},
				{Key: "app_type", Value: "$app_costs.type"},
				{Key: "time", Value: "$time"},
				{Key: "order_id", Value: "$order_id"},
				{Key: "namespace", Value: "$namespace"},
				{Key: "used", Value: "$app_costs.used"},
				{Key: "used_amount", Value: "$app_costs.used_amount"},
				{Key: "amount", Value: "$app_costs.amount"},
			}}},
		}
	} else {
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: bson.D{{Key: "order_id", Value: req.OrderID}, {Key: "owner", Value: req.Owner}}}},
			{{Key: "$unwind", Value: "$app_costs"}},
			{{Key: "$match", Value: bson.D{{Key: "app_costs.name", Value: req.AppName}}}},
			{{Key: "$project", Value: bson.D{
				{Key: "app_name", Value: "$app_costs.name"},
				{Key: "app_type", Value: "$app_type"},
				{Key: "time", Value: "$time"},
				{Key: "order_id", Value: "$order_id"},
				{Key: "namespace", Value: "$namespace"},
				{Key: "used", Value: "$app_costs.used"},
				{Key: "used_amount", Value: "$app_costs.used_amount"},
				{Key: "amount", Value: "$app_costs.amount"},
			}}},
		}
	}
	fmt.Printf("pipeline: %v\n", pipeline)
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %w", err)
	}
	defer cursor.Close(context.Background())

	results := make([]common.AppCost, 0, 50)
	for cursor.Next(context.Background()) {
		var appCost common.AppCost
		if err := cursor.Decode(&appCost); err != nil {
			return nil, fmt.Errorf("failed to decode result: %w", err)
		}
		results = append(results, appCost)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return results, nil
}

func (m *MongoDB) getAppStoreCosts(
	matchConditions bson.D,
	skip, limit int,
) (*common.AppCosts, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchConditions}},
		{{Key: "$sort", Value: bson.D{
			{Key: "time", Value: -1},
			{Key: "app_name", Value: 1},
			{Key: "_id", Value: 1},
		}}},
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: limit}},
		{{Key: "$project", Value: bson.D{
			{Key: "_id", Value: 0},
			{Key: "time", Value: 1},
			{Key: "order_id", Value: 1},
			{Key: "namespace", Value: 1},
			{Key: "amount", Value: 1},
			{Key: "app_name", Value: 1},
			{Key: "app_type", Value: 1},
		}}},
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %w", err)
	}
	defer cursor.Close(context.Background())

	var results common.AppCosts
	if err := cursor.All(context.Background(), &results.Costs); err != nil {
		return nil, fmt.Errorf("failed to decode results: %w", err)
	}
	return &results, nil
}

func (m *MongoDB) GetCostOverview(
	req helper.GetCostAppListReq,
) (resp helper.CostOverviewResp, rErr error) {
	appResp, err := m.GetCostAppList(req)
	if err != nil {
		rErr = fmt.Errorf("failed to get app store list: %w", err)
		return resp, rErr
	}
	resp.LimitResp = appResp.LimitResp
	for _, app := range appResp.Apps {
		totalAmount, err := m.getTotalAppCost(req, app)
		if err != nil {
			rErr = fmt.Errorf("failed to get total app cost: %w", err)
			return resp, rErr
		}
		resp.Overviews = append(resp.Overviews, helper.CostOverview{
			Amount:    totalAmount,
			Namespace: app.Namespace,
			AppType:   app.AppType,
			AppName:   app.AppName,
		})
	}
	return resp, rErr
}

func (m *MongoDB) getTotalAppCost(req helper.GetCostAppListReq, app helper.CostApp) (int64, error) {
	owner := req.Owner
	namespace := app.Namespace
	appName := app.AppName
	appType := app.AppType
	if req.StartTime.IsZero() {
		req.StartTime = time.Now().UTC().Add(-time.Hour * 24 * 30)
		req.EndTime = time.Now().UTC()
	}
	subConsumptionMatch := bson.M{
		"owner":          owner,
		"namespace":      namespace,
		"app_costs.name": appName,
		"app_type":       appType,
		"time": bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		},
		"status": resources.Settled,
	}
	consumptionMatch := bson.M{
		"owner":     owner,
		"namespace": namespace,
		"app_name":  appName,
		"app_type":  appType,
		"time": bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		},
		"status": resources.Settled,
	}
	var pipeline mongo.Pipeline

	if appType == resources.AppType[resources.AppStore] ||
		appType == resources.AppType[resources.LLMToken] {
		// If appType is app-store || llm-token, match app_name and app_type directly
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: consumptionMatch}},
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "totalAmount", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
	} else {
		// Otherwise, match inside app_costs
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: subConsumptionMatch}},
			{{Key: "$unwind", Value: "$app_costs"}},
			{{Key: "$match", Value: bson.D{
				{Key: "app_costs.name", Value: appName},
			}}},
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "totalAmount", Value: bson.D{{Key: "$sum", Value: "$app_costs.amount"}}},
			}}},
		}
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(context.Background())

	var result struct {
		TotalAmount int64 `bson:"totalAmount"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode aggregate result: %w", err)
		}
	} else {
		return 0, errors.New("no records found")
	}

	return result.TotalAmount, nil
}

func (m *MongoDB) GetCostAppList(
	req helper.GetCostAppListReq,
) (resp helper.CostAppListResp, rErr error) {
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	pageSize := req.PageSize
	if strings.ToUpper(req.AppType) != resources.AppStore {
		match := bson.M{
			"owner":    req.Owner,
			"type":     resources.Consumption,
			"app_type": bson.M{"$ne": resources.AppType[resources.AppStore]},
		}
		if req.Namespace != "" {
			match["namespace"] = req.Namespace
		}
		if req.AppType != "" {
			match["app_type"] = resources.AppType[strings.ToUpper(req.AppType)]
		}
		if req.StartTime.IsZero() {
			req.StartTime = time.Now().UTC().Add(-time.Hour * 24 * 30)
			req.EndTime = time.Now().UTC()
		}
		match["time"] = bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		}

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: match}},
			{{Key: "$facet", Value: bson.D{
				{Key: "withAppCosts", Value: bson.A{
					bson.D{
						{
							Key:   "$match",
							Value: bson.D{{Key: "app_costs", Value: bson.M{"$exists": true}}},
						},
					},
					bson.D{{Key: "$unwind", Value: "$app_costs"}},
					bson.D{{Key: "$group", Value: bson.D{
						{Key: "_id", Value: bson.D{
							{Key: "app_type", Value: "$app_type"},
							{Key: "app_name", Value: "$app_costs.name"},
							{Key: "namespace", Value: "$namespace"},
							{Key: "owner", Value: "$owner"},
						}},
					}}},
				}},
				{Key: "withoutAppCosts", Value: bson.A{
					bson.D{{Key: "$match", Value: bson.D{
						{Key: "app_costs", Value: bson.M{"$exists": false}},
						{Key: "app_name", Value: bson.M{"$exists": true}},
					}}},
					bson.D{{Key: "$group", Value: bson.D{
						{Key: "_id", Value: bson.D{
							{Key: "app_type", Value: "$app_type"},
							{Key: "app_name", Value: "$app_name"},
							{Key: "namespace", Value: "$namespace"},
							{Key: "owner", Value: "$owner"},
						}},
					}}},
				}},
			}}},
			{{Key: "$project", Value: bson.D{
				{
					Key: "combined",
					Value: bson.D{
						{Key: "$concatArrays", Value: bson.A{"$withAppCosts", "$withoutAppCosts"}},
					},
				},
			}}},
			{{Key: "$unwind", Value: "$combined"}},
			{{Key: "$replaceRoot", Value: bson.D{{Key: "newRoot", Value: "$combined._id"}}}},
		}

		if req.AppName != "" {
			pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.D{
				{Key: "app_name", Value: req.AppName},
			}}})
		}

		pipeline = append(pipeline, bson.D{
			{Key: "$project", Value: bson.D{
				{Key: "_id", Value: 0},
				{Key: "namespace", Value: "$namespace"},
				{Key: "appType", Value: "$app_type"},
				{Key: "owner", Value: "$owner"},
				{Key: "appName", Value: "$app_name"},
			}},
		})

		pipeline = append(pipeline, bson.D{{Key: "$sort", Value: bson.D{
			{Key: "appName", Value: 1},
			{Key: "appType", Value: -1},
			{Key: "namespace", Value: 1},
			{Key: "amount", Value: 1},
		}}})

		var countPipeline mongo.Pipeline
		// Fix: Manual copy to avoid copy() issues with complex types
		countPipeline = append(countPipeline, pipeline...)
		countPipeline = append(countPipeline, bson.D{{Key: "$count", Value: "total"}})
		countCursor, err := m.getBillingCollection().Aggregate(context.Background(), countPipeline)
		if err != nil {
			return resp, fmt.Errorf("failed to execute count aggregate query: %w", err)
		}
		defer countCursor.Close(context.Background())

		if countCursor.Next(context.Background()) {
			var countResult struct {
				Total int64 `bson:"total"`
			}
			if err := countCursor.Decode(&countResult); err != nil {
				return resp, fmt.Errorf("failed to decode count result: %w", err)
			}
			resp.Total = countResult.Total
		}
		pipeline = append(pipeline,
			bson.D{{Key: "$skip", Value: (req.Page - 1) * pageSize}},
			bson.D{{Key: "$limit", Value: pageSize}},
		)

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
		if err != nil {
			return resp, fmt.Errorf("failed to execute aggregate query: %w", err)
		}
		defer cursor.Close(context.Background())

		var result []helper.CostApp
		if err := cursor.All(context.Background(), &result); err != nil {
			return resp, fmt.Errorf("failed to decode all billing record: %w", err)
		}
		resp.Apps = result
	}
	appStoreTotal, err := m.getAppStoreTotal(req)
	if err != nil {
		return resp, fmt.Errorf("failed to get app store total: %w", err)
	}

	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		currentAppPageIsFull := len(resp.Apps) == req.PageSize
		maxAppPageSize := (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)
		completedNum := calculateComplement(int(resp.Total), req.PageSize)
		appPageSize := (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)

		if req.Page == int(maxAppPageSize) {
			if !currentAppPageIsFull {
				appStoreResp, err := m.getAppStoreList(req, 0, completedNum)
				if err != nil {
					return resp, fmt.Errorf("failed to get app store list: %w", err)
				}
				resp.Apps = append(resp.Apps, appStoreResp.Apps...)
			}
		} else if req.Page > int(maxAppPageSize) {
			skipPageSize := (req.Page - int(appPageSize) - 1) * req.PageSize
			if skipPageSize < 0 {
				skipPageSize = 0
			}
			appStoreResp, err := m.getAppStoreList(req, completedNum+skipPageSize, req.PageSize)
			if err != nil {
				return resp, fmt.Errorf("failed to get app store list: %w", err)
			}
			resp.Apps = append(resp.Apps, appStoreResp.Apps...)
		}
		resp.Total += appStoreTotal
	}

	resp.TotalPage = (resp.Total + int64(pageSize) - 1) / int64(pageSize)
	return resp, nil
}

func calculateComplement(a, b int) int {
	remainder := a % b
	if remainder == 0 {
		return 0
	}
	return b - remainder
}

func (m *MongoDB) executeCountQuery(ctx context.Context, pipeline []bson.M) (int64, error) {
	countCursor, err := m.getBillingCollection().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to execute count aggregate query: %w", err)
	}
	defer countCursor.Close(ctx)

	var countResult struct {
		Total int64 `bson:"total"`
	}
	if countCursor.Next(ctx) {
		if err := countCursor.Decode(&countResult); err != nil {
			return 0, fmt.Errorf("failed to decode count result: %w", err)
		}
	}
	return countResult.Total, nil
}

// GetBasicCostDistribution cost: map[string]int64: key: property type (cpu,memory,storage,network,nodeport: 0,1,2,3,4), value: used amount
func (m *MongoDB) GetBasicCostDistribution(req helper.GetCostAppListReq) (map[string]int64, error) {
	cost := make(map[string]int64, len(resources.DefaultPropertyTypeLS.EnumMap))
	for i := range resources.DefaultPropertyTypeLS.EnumMap {
		cost[strconv.Itoa(int(i))] = 0
	}

	match := buildMatchCriteria(req)
	groupStage := buildGroupStage()
	projectStage := buildProjectStage()

	if req.AppType == "" || strings.ToUpper(req.AppType) != resources.AppStore {
		if err := aggregateAndUpdateCost(m, match, groupStage, projectStage, req.AppName, cost); err != nil {
			return nil, err
		}
	}

	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		match["app_type"] = resources.AppType[resources.AppStore]
		delete(match, "app_costs.name")
		if req.AppName != "" {
			match["app_name"] = req.AppName
		}
		if err := aggregateAndUpdateCost(m, match, groupStage, projectStage, "", cost); err != nil {
			return nil, err
		}
	}
	return cost, nil
}

func (m *MongoDB) GetAppCostTimeRange(req helper.GetCostAppListReq) (helper.TimeRange, error) {
	match := buildMatchCriteria(req)
	delete(match, "time") // Remove time constraint from match criteria

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$unwind", Value: "$app_costs"}},
	}

	if req.AppName != "" {
		pipeline = append(
			pipeline,
			bson.D{{Key: "$match", Value: bson.M{"app_costs.name": req.AppName}}},
		)
	}

	pipeline = append(pipeline,
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "startTime", Value: bson.D{{Key: "$min", Value: "$time"}}},
			{Key: "endTime", Value: bson.D{{Key: "$max", Value: "$time"}}},
		}}},
	)

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return helper.TimeRange{}, fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(context.Background())

	var result helper.TimeRange
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return helper.TimeRange{}, fmt.Errorf("failed to decode aggregate result: %w", err)
		}
	} else {
		return helper.TimeRange{}, errors.New("no records found")
	}

	// If the app type is empty or app store, also check the app store records
	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		match["app_type"] = resources.AppType[resources.AppStore]
		delete(match, "app_costs.name")
		if req.AppName != "" {
			match["app_name"] = req.AppName
		}

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: match}},
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "startTime", Value: bson.D{{Key: "$min", Value: "$time"}}},
				{Key: "endTime", Value: bson.D{{Key: "$max", Value: "$time"}}},
			}}},
		}

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
		if err != nil {
			return helper.TimeRange{}, fmt.Errorf(
				"failed to execute aggregate query for app store: %w",
				err,
			)
		}
		defer cursor.Close(context.Background())

		var appStoreResult helper.TimeRange
		if cursor.Next(context.Background()) {
			if err := cursor.Decode(&appStoreResult); err != nil {
				return helper.TimeRange{}, fmt.Errorf(
					"failed to decode aggregate result for app store: %w",
					err,
				)
			}

			// Update the overall time range if necessary
			if appStoreResult.StartTime.Before(result.StartTime) {
				result.StartTime = appStoreResult.StartTime
			}
			if appStoreResult.EndTime.After(result.EndTime) {
				result.EndTime = appStoreResult.EndTime
			}
		}
	}

	return result, nil
}

func buildMatchCriteria(req helper.GetCostAppListReq) bson.M {
	match := bson.M{
		"owner":    req.Owner,
		"app_type": bson.M{"$ne": resources.AppType[resources.AppStore]},
	}
	if req.Namespace != "" {
		match["namespace"] = req.Namespace
	}
	if req.AppType != "" {
		match["app_type"] = resources.AppType[strings.ToUpper(req.AppType)]
	}
	if req.AppName != "" {
		match["app_costs.name"] = req.AppName
	}
	if req.StartTime.IsZero() {
		req.StartTime = time.Now().UTC().Add(-time.Hour * 24 * 30)
		req.EndTime = time.Now().UTC()
	}
	match["time"] = bson.M{
		"$gte": req.StartTime,
		"$lte": req.EndTime,
	}
	return match
}

func buildGroupStage() bson.D {
	groupFields := bson.D{}
	for i := range resources.DefaultPropertyTypeLS.EnumMap {
		key := fmt.Sprintf("used_amount_%d", i)
		field := fmt.Sprintf("$app_costs.used_amount.%d", i)
		groupFields = append(groupFields, bson.E{
			Key: key, Value: bson.D{
				{Key: "$sum", Value: bson.D{
					{Key: "$ifNull", Value: bson.A{bson.D{{Key: "$toLong", Value: field}}, 0}},
				}},
			},
		})
	}
	return bson.D{{Key: "$group", Value: append(bson.D{{Key: "_id", Value: nil}}, groupFields...)}}
}

func buildProjectStage() bson.D {
	projectFields := bson.D{}
	for i := range resources.DefaultPropertyTypeLS.EnumMap {
		key := fmt.Sprintf("used_amount.%d", i)
		field := fmt.Sprintf("$used_amount_%d", i)
		projectFields = append(projectFields, bson.E{Key: key, Value: field})
	}
	return bson.D{{Key: "$project", Value: projectFields}}
}

func aggregateAndUpdateCost(
	m *MongoDB,
	match bson.M,
	groupStage, projectStage bson.D,
	appName string,
	cost map[string]int64,
) error {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$unwind", Value: "$app_costs"}},
	}
	if appName != "" {
		pipeline = append(
			pipeline,
			bson.D{{Key: "$match", Value: bson.M{"app_costs.name": appName}}},
		)
	}
	pipeline = append(pipeline, groupStage, projectStage)

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(context.Background())

	var result struct {
		UsedAmount map[string]int64 `bson:"used_amount"`
	}
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return fmt.Errorf("failed to decode aggregate result: %w", err)
		}
		for i, v := range result.UsedAmount {
			cost[i] += v
		}
	}
	return nil
}

func (m *MongoDB) getAppPipeLine(req helper.GetCostAppListReq) []bson.M {
	match := bson.M{
		"owner":    req.Owner,
		"app_type": resources.AppType[resources.AppStore],
	}
	if req.Namespace != "" {
		match["namespace"] = req.Namespace
	}
	if req.AppName != "" {
		match["app_name"] = req.AppName
	}
	if !req.StartTime.IsZero() {
		match["time"] = bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		}
	}

	pipeline := []bson.M{
		{"$match": match},
		{"$unwind": "$app_costs"},
		{"$sort": bson.M{
			"time": -1,
		}},
		{"$group": bson.M{
			"_id": bson.M{
				"namespace": "$namespace",
				"app_type":  "$app_type",
				"owner":     "$owner",
				"app_name":  "$app_name",
			},
		}},
		{"$project": bson.M{
			"_id":       0,
			"namespace": "$_id.namespace",
			"appType":   "$_id.app_type",
			"owner":     "$_id.owner",
			"appName":   "$_id.app_name",
		}},
	}
	return pipeline
}

func (m *MongoDB) getAppStoreTotal(req helper.GetCostAppListReq) (int64, error) {
	return m.executeCountQuery(
		context.Background(),
		append(m.getAppPipeLine(req), bson.M{"$count": "total"}),
	)
}

func (m *MongoDB) getAppStoreList(
	req helper.GetCostAppListReq,
	skip, pageSize int,
) (resp helper.CostAppListResp, rErr error) {
	pipeline := m.getAppPipeLine(req)
	skipStage := bson.M{"$skip": skip}
	limitStage := bson.M{"$limit": pageSize}
	// Fix: Manual copy to avoid copy() issues
	limitPipeline := make([]bson.M, len(pipeline))
	copy(limitPipeline, pipeline)
	limitPipeline = append(limitPipeline, skipStage, limitStage)

	resp.Total, rErr = m.executeCountQuery(
		context.Background(),
		append(m.getAppPipeLine(req), bson.M{"$count": "total"}),
	)
	if rErr != nil {
		rErr = fmt.Errorf("failed to execute count aggregate query: %w", rErr)
		return resp, rErr
	}
	if req.PageSize > 0 {
		resp.TotalPage = (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)
	}

	if req.PageSize > 0 {
		cursor, err := m.getBillingCollection().Aggregate(context.Background(), limitPipeline)
		if err != nil {
			rErr = fmt.Errorf("failed to execute aggregate query: %w", err)
			return resp, rErr
		}
		defer cursor.Close(context.Background())

		var result []helper.CostApp
		if err = cursor.All(context.Background(), &result); err != nil {
			rErr = fmt.Errorf("failed to decode all billing record: %w", err)
			return resp, rErr
		}
		resp.Apps = result
	}
	return resp, rErr
}

func (m *Account) Disconnect(ctx context.Context) error {
	if m == nil {
		return nil
	}
	if m.MongoDB != nil && m.Client != nil {
		if err := m.Client.Disconnect(ctx); err != nil {
			return fmt.Errorf("failed to close mongodb client: %w", err)
		}
	}
	if m.Cockroach != nil && m.ck != nil {
		if err := m.ck.Close(); err != nil {
			return fmt.Errorf("failed to close cockroach client: %w", err)
		}
	}
	return nil
}

func (m *MongoDB) GetConsumptionAmount(req helper.ConsumptionRecordReq) (int64, error) {
	owner, namespace, appType, appName, startTime, endTime := req.Owner, req.Namespace, req.AppType, req.AppName, req.StartTime, req.EndTime
	timeMatchValue := bson.D{
		primitive.E{Key: "$gte", Value: startTime},
		primitive.E{Key: "$lte", Value: endTime},
	}
	matchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
		primitive.E{Key: "status", Value: resources.Settled},
		primitive.E{Key: "owner", Value: owner},
	}
	if appType != "" {
		matchValue = append(
			matchValue,
			primitive.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(appType)]},
		)
	}
	if namespace != "" {
		matchValue = append(matchValue, primitive.E{Key: "namespace", Value: namespace})
	}
	unwindMatchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
	}
	if appType != "" && appName != "" {
		if appType != resources.AppStore {
			unwindMatchValue = append(
				unwindMatchValue,
				primitive.E{Key: "app_costs.name", Value: appName},
			)
		} else {
			unwindMatchValue = append(unwindMatchValue, primitive.E{Key: "app_name", Value: appName})
		}
	}
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: matchValue}},
		bson.D{{Key: "$unwind", Value: "$app_costs"}},
		bson.D{{Key: "$match", Value: unwindMatchValue}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$app_costs.amount"},
		}}},
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to aggregate billing collection: %w", err)
	}
	defer cursor.Close(context.Background())

	var result struct {
		Total int64 `bson:"total"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode result: %w", err)
		}
	}
	return result.Total, nil
}

func (m *MongoDB) GetWorkspaceConsumptionAmount(
	req helper.ConsumptionRecordReq,
) (map[string]int64, error) {
	// 获取各个 namespace的费用
	owner, appType, appName, startTime, endTime := req.Owner, req.AppType, req.AppName, req.StartTime, req.EndTime
	timeMatchValue := bson.D{
		primitive.E{Key: "$gte", Value: startTime},
		primitive.E{Key: "$lte", Value: endTime},
	}
	matchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
		primitive.E{Key: "owner", Value: owner},
		primitive.E{Key: "status", Value: resources.Settled},
	}

	// 添加app_type过滤条件
	if appType != "" {
		matchValue = append(
			matchValue,
			primitive.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(appType)]},
		)
	}

	// 构建unwind后的匹配条件
	unwindMatchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
	}
	if appType != "" && appName != "" {
		if appType != resources.AppStore {
			unwindMatchValue = append(
				unwindMatchValue,
				primitive.E{Key: "app_costs.name", Value: appName},
			)
		} else {
			unwindMatchValue = append(unwindMatchValue, primitive.E{Key: "app_name", Value: appName})
		}
	}

	// 构建聚合管道：按namespace分组统计amount
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: matchValue}},
		bson.D{{Key: "$unwind", Value: "$app_costs"}},
		bson.D{{Key: "$match", Value: unwindMatchValue}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   "$namespace", // 按namespace分组
			"total": bson.M{"$sum": "$app_costs.amount"},
		}}},
		bson.D{{Key: "$sort", Value: bson.M{"_id": 1}}}, // 按namespace排序
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %w", err)
	}
	defer cursor.Close(context.Background())

	// 构建结果map
	result := make(map[string]int64)
	for cursor.Next(context.Background()) {
		var doc struct {
			Namespace string `bson:"_id"`
			Total     int64  `bson:"total"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return nil, fmt.Errorf("failed to decode result: %w", err)
		}
		result[doc.Namespace] = doc.Total
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return result, nil
}

func (m *MongoDB) GetPropertiesUsedAmount(
	user string,
	startTime, endTime time.Time,
) (map[string]int64, error) {
	propertiesUsedAmount := make(map[string]int64)
	for _, property := range m.Properties.Types {
		amount, err := m.getSumOfUsedAmount(property.Enum, user, startTime, endTime)
		if err != nil {
			return nil, fmt.Errorf("failed to get sum of used amount: %w", err)
		}
		propertiesUsedAmount[property.Name] = amount
	}
	return propertiesUsedAmount, nil
}

func (m *MongoDB) getSumOfUsedAmount(
	propertyType uint8,
	user string,
	startTime, endTime time.Time,
) (int64, error) {
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: bson.M{
			"time":                    bson.M{"$gte": startTime, "$lte": endTime},
			"owner":                   user,
			"app_costs.used_amount.0": bson.M{"$exists": true},
		}}},
		bson.D{{Key: "$unwind", Value: "$app_costs"}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id": nil,
			"totalAmount": bson.M{
				"$sum": "$app_costs.used_amount." + strconv.Itoa(int(propertyType)),
			},
		}}},
	}
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to get billing collection: %w", err)
	}
	defer cursor.Close(context.Background())
	var result struct {
		TotalAmount int64 `bson:"totalAmount"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode result: %w", err)
		}
	}
	return result.TotalAmount, nil
}

func (m *MongoDB) GetMonitorUniqueValues(
	startTime, endTime time.Time,
	namespaces []string,
) ([]common.Monitor, error) {
	ctx := context.Background()
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"time": bson.M{
				"$gte": startTime,
				"$lte": endTime,
			},
			"category": bson.M{
				"$in": namespaces,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"category":    "$category",
				"parent_type": "$parent_type",
				"parent_name": "$parent_name",
				"type":        "$type",
				"name":        "$name",
			},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":         0,
			"namespace":   "$_id.category",
			"parent_type": "$_id.parent_type",
			"parent_name": "$_id.parent_name",
			"type":        "$_id.type",
			"name":        "$_id.name",
		}}},
	}

	cursor, err := m.getMonitorCollection(startTime).Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("aggregate error: %w", err)
	}
	defer cursor.Close(ctx)
	var result []common.Monitor
	if err := cursor.All(ctx, &result); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}
	return result, nil
}

func NewAccountInterface(
	mongoURI, globalCockRoachURI, localCockRoachURI string,
) (Interface, error) {
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, fmt.Errorf("failed to connect mongodb: %w", err)
	}
	if err = client.Ping(context.Background(), nil); err != nil {
		return nil, fmt.Errorf("failed to ping mongodb: %w", err)
	}
	mongodb := &MongoDB{
		Client:            client,
		AccountDBName:     "sealos-resources",
		BillingConn:       "billing",
		ActiveBillingConn: "active-billing",
		PropertiesConn:    "properties",
	}
	ck, err := cockroach.NewCockRoach(globalCockRoachURI, localCockRoachURI)
	if err != nil {
		return nil, fmt.Errorf("failed to connect cockroach: %w", err)
	}
	account := &Account{MongoDB: mongodb, Cockroach: &Cockroach{ck: ck}}
	if err = account.InitDB(); err != nil {
		return nil, fmt.Errorf("failed to init tables: %w", err)
	}
	return account, nil
}

func newAccountForTest(mongoURI, globalCockRoachURI, localCockRoachURI string) (Interface, error) {
	account := &Account{}
	if mongoURI != "" {
		client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
		if err != nil {
			return nil, fmt.Errorf("failed to connect mongodb: %w", err)
		}
		if err = client.Ping(context.Background(), nil); err != nil {
			return nil, fmt.Errorf("failed to ping mongodb: %w", err)
		}
		account.MongoDB = &MongoDB{
			Client:            client,
			AccountDBName:     "sealos-resources",
			BillingConn:       "billing",
			ActiveBillingConn: "active-billing",
			PropertiesConn:    "properties",
		}
	} else {
		fmt.Printf("mongoURI is empty, skip connecting to mongodb\n")
	}
	if globalCockRoachURI != "" && localCockRoachURI != "" {
		ck, err := cockroach.NewCockRoach(globalCockRoachURI, localCockRoachURI)
		if err != nil {
			return nil, fmt.Errorf("failed to connect cockroach: %w", err)
		}
		if err = ck.InitTables(); err != nil {
			return nil, fmt.Errorf("failed to init tables: %w", err)
		}
		account.Cockroach = &Cockroach{ck: ck}
	} else {
		fmt.Printf("globalCockRoachURI or localCockRoachURI is empty, skip connecting to cockroach\n")
	}
	return account, nil
}

func NewAccountForTest(mongoURI, globalCockRoachURI, localCockRoachURI string) (Interface, error) {
	account := &Account{}
	if mongoURI != "" {
		client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
		if err != nil {
			return nil, fmt.Errorf("failed to connect mongodb: %w", err)
		}
		if err = client.Ping(context.Background(), nil); err != nil {
			return nil, fmt.Errorf("failed to ping mongodb: %w", err)
		}
		account.MongoDB = &MongoDB{
			Client:            client,
			AccountDBName:     "sealos-resources",
			BillingConn:       "billing",
			ActiveBillingConn: "active-billing",
			PropertiesConn:    "properties",
		}
	} else {
		fmt.Printf("mongoURI is empty, skip connecting to mongodb\n")
	}
	if globalCockRoachURI != "" && localCockRoachURI != "" {
		ck, err := cockroach.NewCockRoach(globalCockRoachURI, localCockRoachURI)
		if err != nil {
			return nil, fmt.Errorf("failed to connect cockroach: %w", err)
		}
		// if err = ck.InitTables(); err != nil {
		//	return nil, fmt.Errorf("failed to init tables: %v", err)
		//}
		account.Cockroach = &Cockroach{ck: ck}
	} else {
		fmt.Printf("globalCockRoachURI or localCockRoachURI is empty, skip connecting to cockroach\n")
	}
	return account, nil
}

func (m *MongoDB) getProperties() (*resources.PropertyTypeLS, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cursor, err := m.getPropertiesCollection().Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("get all prices error: %w", err)
	}
	var properties []resources.PropertyType
	if err = cursor.All(ctx, &properties); err != nil {
		return nil, fmt.Errorf("get all prices error: %w", err)
	}
	if len(properties) != 0 {
		resources.DefaultPropertyTypeLS = resources.NewPropertyTypeLS(properties)
	}
	return resources.DefaultPropertyTypeLS, nil
}

func (m *MongoDB) getPropertiesCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDBName).Collection(m.PropertiesConn)
}

func (m *Account) GetBillingHistoryNamespaceList(
	req *helper.NamespaceBillingHistoryReq,
) ([][]string, error) {
	filter := bson.M{
		"owner": req.Owner,
	}
	if req.StartTime != req.EndTime {
		filter["time"] = bson.M{
			"$gte": req.StartTime.UTC(),
			"$lte": req.EndTime.UTC(),
		}
	}
	if req.Type != -1 {
		filter["type"] = req.Type
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{
			{
				Key: "$group",
				Value: bson.D{
					{Key: "_id", Value: nil},
					{Key: "namespaces", Value: bson.D{{Key: "$addToSet", Value: "$namespace"}}},
				},
			},
		},
	}

	cur, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())
	var result struct {
		Namespaces []string `bson:"namespaces"`
	}
	if cur.Next(context.Background()) {
		if err := cur.Decode(&result); err != nil {
			return nil, err
		}
	}
	subNSList, err := m.ListWorkspaceSubscriptionWorkspace(req.UserUID)
	if err != nil {
		return nil, fmt.Errorf("failed to list workspace subscription: %w", err)
	}
	result.Namespaces = append(result.Namespaces, subNSList...)
	if len(result.Namespaces) == 0 {
		return [][]string{}, nil
	}
	return m.GetWorkspaceName(result.Namespaces)
}

func (m *MongoDB) getBillingCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDBName).Collection(m.BillingConn)
}

func (m *MongoDB) getMonitorCollection(collTime time.Time) *mongo.Collection {
	// 2020-12-01 00:00:00 - 2020-12-01 23:59:59
	return m.Client.Database(m.AccountDBName).Collection(m.getMonitorCollectionName(collTime))
}

func (m *MongoDB) getActiveBillingCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDBName).Collection(m.ActiveBillingConn)
}

func (m *MongoDB) getMonitorCollectionName(collTime time.Time) string {
	// Calculate the suffix by day, for example, the suffix on the first day of 202012 is 20201201
	return fmt.Sprintf("%s_%s", "monitor", collTime.Format("20060102"))
}

func (m *Account) ApplyInvoice(
	req *helper.ApplyInvoiceReq,
) (invoice types.Invoice, payments []types.Payment, err error) {
	if len(req.PaymentIDList) == 0 {
		return invoice, payments, err
	}
	payments, err = m.ck.GetUnInvoicedPaymentListWithIDs(req.PaymentIDList)
	if err != nil {
		err = fmt.Errorf("failed to get payment list: %w", err)
		return invoice, payments, err
	}
	if len(payments) == 0 {
		return invoice, payments, err
	}
	amount := int64(0)
	paymentIDs := make([]string, 0, len(payments))
	invoicePayments := make([]types.InvoicePayment, 0, len(payments))
	id, err := gonanoid.New(12)
	if err != nil {
		err = fmt.Errorf("failed to generate payment id: %w", err)
		return invoice, payments, err
	}
	for i := range payments {
		if payments[i].ChargeSource == types.ChargeSourceBalance {
			continue
		}
		amount += payments[i].Amount
		paymentIDs = append(paymentIDs, payments[i].ID)
		invoicePayments = append(invoicePayments, types.InvoicePayment{
			PaymentID: payments[i].ID,
			Amount:    payments[i].Amount,
			InvoiceID: id,
		})
	}
	invoice = types.Invoice{
		ID:          id,
		UserID:      req.UserID,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
		Detail:      req.Detail,
		TotalAmount: amount,
		Status:      types.PendingInvoiceStatus,
	}
	// save invoice with transaction
	if err = m.ck.DB.Transaction(
		func(tx *gorm.DB) error {
			if err = m.ck.SetPaymentInvoiceWithDB(&types.UserQueryOpts{ID: req.UserID}, paymentIDs, tx); err != nil {
				return fmt.Errorf("failed to set payment invoice: %w", err)
			}
			if err = m.ck.CreateInvoiceWithDB(&invoice, tx); err != nil {
				return fmt.Errorf("failed to create invoice: %w", err)
			}
			if err = m.ck.CreateInvoicePaymentsWithDB(invoicePayments, tx); err != nil {
				return fmt.Errorf("failed to create invoice payments: %w", err)
			}
			return nil
		}); err != nil {
		err = fmt.Errorf("failed to apply invoice: %w", err)
		return invoice, payments, err
	}
	return invoice, payments, err
}

func (m *Account) GetInvoice(req *helper.GetInvoiceReq) ([]types.Invoice, types.LimitResp, error) {
	if req.InvoiceID != "" {
		invoice, err := m.ck.GetInvoiceWithID(req.InvoiceID)
		if err != nil {
			return nil, types.LimitResp{}, fmt.Errorf("failed to get invoice: %w", err)
		}
		return []types.Invoice{*invoice}, types.LimitResp{Total: 1, TotalPage: 1}, nil
	}
	return m.ck.GetInvoice(req.UserID, types.LimitReq{
		Page:     req.Page,
		PageSize: req.PageSize,
		TimeRange: types.TimeRange{
			StartTime: req.StartTime,
			EndTime:   req.EndTime,
		},
	})
}

func (m *Account) GetInvoicePayments(invoiceID string) ([]types.Payment, error) {
	return m.ck.GetPaymentWithInvoice(invoiceID)
}

func (m *Account) SetStatusInvoice(req *helper.SetInvoiceStatusReq) error {
	return m.ck.SetInvoiceStatus(req.InvoiceIDList, req.Status)
}

func (m *Account) UseGiftCode(req *helper.UseGiftCodeReq) (*types.GiftCode, error) {
	giftCode, err := m.ck.GetGiftCodeWithCode(req.Code)
	if err != nil {
		return nil, fmt.Errorf("failed to get gift code: %w", err)
	}

	if !giftCode.ExpiredAt.IsZero() && time.Now().After(giftCode.ExpiredAt) {
		return nil, errors.New("gift code has expired")
	}

	if giftCode.Used {
		return nil, errors.New("gift code is already used")
	}

	if err = m.ck.UseGiftCode(giftCode, req.UserID); err != nil {
		return nil, fmt.Errorf("failed to use gift code: %w", err)
	}

	return giftCode, nil
}

func (m *Account) GetRechargeDiscount(req helper.AuthReq) (helper.RechargeDiscountResp, error) {
	userQuery := &types.UserQueryOpts{UID: req.GetAuth().UserUID}
	userDiscount, err := m.ck.GetUserRechargeDiscount(userQuery)
	if err != nil {
		return helper.RechargeDiscountResp{}, fmt.Errorf(
			"failed to get user recharge discount: %w",
			err,
		)
	}
	return helper.RechargeDiscountResp{
		DefaultSteps:       userDiscount.DefaultSteps,
		FirstRechargeSteps: userDiscount.FirstRechargeSteps,
	}, nil
}

func (m *Account) ProcessPendingTaskRewards() error {
	return m.ck.ProcessPendingTaskRewards()
}

func (m *Account) GetUserRealNameInfo(
	req *helper.GetRealNameInfoReq,
) (*types.UserRealNameInfo, error) {
	// get user info
	userRealNameInfo, err := m.ck.GetUserRealNameInfoByUserID(req.UserID)
	if err != nil {
		return nil, err
	}

	return userRealNameInfo, nil
}

func (m *Account) GetEnterpriseRealNameInfo(
	req *helper.GetRealNameInfoReq,
) (*types.EnterpriseRealNameInfo, error) {
	// get enterprise info
	enterpriseRealNameInfo, err := m.ck.GetEnterpriseRealNameInfoByUserID(req.UserID)
	if err != nil {
		return nil, err
	}

	return enterpriseRealNameInfo, nil
}

func (m *Account) ReconcileActiveBilling(startTime, endTime time.Time) error {
	ctx := context.Background()
	billings := make(map[uuid.UUID]*billingBatch)

	// Process billings in batches
	if err := m.processBillingBatches(ctx, startTime, endTime, billings); err != nil {
		helper.ErrorCounter.WithLabelValues("ReconcileActiveBilling", "processBillingBatches", "").
			Inc()
		return fmt.Errorf("failed to process billing batches: %w", err)
	}

	// Handle each user's billings
	for uid, batch := range billings {
		if err := m.reconcileUserBilling(ctx, uid, batch); err != nil {
			helper.ErrorCounter.WithLabelValues("ReconcileActiveBilling", "reconcileUserBilling", uid.String()).
				Inc()
			logrus.Errorf("failed to reconcile billing for user %s: %v", uid, err)
			continue
		}
	}

	return nil
}

type billingBatch struct {
	IDs    []primitive.ObjectID
	Amount int64
}

func (m *Account) processBillingBatches(
	ctx context.Context,
	startTime, endTime time.Time,
	billings map[uuid.UUID]*billingBatch,
) error {
	filter := bson.M{
		"time": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
		"status": bson.M{"$nin": []resources.ConsumptionStatus{
			resources.Processing,
			resources.Consumed,
		}},
	}
	var errs []error

	for {
		var billing resources.ActiveBilling
		err := m.MongoDB.getActiveBillingCollection().FindOneAndUpdate(
			ctx,
			filter,
			bson.M{"$set": bson.M{"status": resources.Processing}},
			options.FindOneAndUpdate().
				SetReturnDocument(options.After).
				SetSort(bson.M{"time": 1}),
		).Decode(&billing)

		if errors.Is(err, mongo.ErrNoDocuments) {
			break
		}
		// TODO error handling
		if err != nil {
			// logrus.Errorf("failed to find and update billing: %v", err)
			errs = append(errs, err)
			continue
		}

		batch, ok := billings[billing.UserUID]
		if !ok {
			batch = &billingBatch{
				IDs:    make([]primitive.ObjectID, 0),
				Amount: 0,
			}
			billings[billing.UserUID] = batch
		}
		batch.IDs = append(batch.IDs, billing.ID)
		batch.Amount += billing.Amount
	}
	if len(errs) > 0 {
		return fmt.Errorf("encountered errors during billing processing: %v", errs)
	}

	return nil
}

func (m *Account) reconcileUserBilling(
	ctx context.Context,
	uid uuid.UUID,
	batch *billingBatch,
) error {
	return m.ck.DB.Transaction(func(tx *gorm.DB) error {
		// Deduct balance
		if err := m.ck.AddDeductionBalanceWithDB(&types.UserQueryOpts{UID: uid}, batch.Amount, tx); err != nil {
			return fmt.Errorf("failed to deduct balance: %w", err)
		}

		// Update billing status
		_, err := m.MongoDB.getActiveBillingCollection().UpdateMany(
			ctx,
			bson.M{"_id": bson.M{"$in": batch.IDs}},
			bson.M{"$set": bson.M{"status": resources.Consumed}},
		)
		if err != nil {
			return fmt.Errorf("failed to update billing status: %w", err)
		}

		return nil
	})
}

func (m *Account) ChargeBilling(req *helper.AdminChargeBillingReq) error {
	billing := &resources.ActiveBilling{
		Namespace: req.Namespace,
		AppType:   req.AppType,
		AppName:   req.AppName,
		Amount:    req.Amount,
		// Owner:     userCr.CrName,
		Time:    time.Now().UTC(),
		Status:  resources.Unconsumed,
		UserUID: req.UserUID,
	}
	err := m.SaveActiveBillings(billing)
	if err != nil {
		return fmt.Errorf("save active monitor failed: %w", err)
	}
	return nil
}

func (m *Account) ActiveBilling(req resources.ActiveBilling) error {
	return m.ck.DB.Transaction(func(tx *gorm.DB) error {
		if err := m.ck.AddDeductionBalanceWithDB(&types.UserQueryOpts{UID: req.UserUID}, req.Amount, tx); err != nil {
			helper.ErrorCounter.WithLabelValues("ActiveBilling", "AddDeductionBalanceWithDB", req.UserUID.String()).
				Inc()
			return fmt.Errorf("failed to deduct balance: %w", err)
		}
		req.Status = resources.Consumed
		_, err := m.getActiveBillingCollection().InsertOne(context.Background(), req)
		if err != nil {
			helper.ErrorCounter.WithLabelValues("ActiveBilling", "InsertOne", req.UserUID.String()).
				Inc()
			return fmt.Errorf("failed to insert (%v) monitor: %w", req, err)
		}
		return nil
	})
}

func (m *MongoDB) UpdateBillingStatus(orderID string, status resources.BillingStatus) error {
	filter := bson.M{"order_id": orderID}
	update := bson.M{
		"$set": bson.M{
			"status": status,
		},
	}
	_, err := m.getBillingCollection().UpdateOne(context.Background(), filter, update)
	if err != nil {
		return fmt.Errorf("update error: %w", err)
	}
	return nil
}

func (m *Account) ReconcileUnsettledLLMBilling(startTime, endTime time.Time) error {
	unsettledAmounts, err := m.reconcileUnsettledLLMBilling(startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to get unsettled billing: %w", err)
	}
	for userUID, amount := range unsettledAmounts {
		err = m.ck.DB.Transaction(func(tx *gorm.DB) error {
			// 1. deduct balance
			if err := m.ck.AddDeductionBalanceWithDB(&types.UserQueryOpts{UID: userUID}, amount, tx); err != nil {
				return fmt.Errorf("failed to deduct balance: %w", err)
			}
			// 2. update billing status
			filter := bson.M{
				"user_uid": userUID,
				"type":     resources.SubConsumption,
				"status":   resources.Unsettled,
				"app_type": resources.AppType[resources.LLMToken],
				"time": bson.M{
					"$gte": startTime,
					"$lte": endTime,
				},
			}
			update := bson.M{
				"$set": bson.M{
					"status": resources.Settled,
				},
			}

			_, err = m.MongoDB.getBillingCollection().
				UpdateMany(context.Background(), filter, update)
			if err != nil {
				return fmt.Errorf("failed to update billing status: %w", err)
			}

			return nil
		})
		// If the transaction fails, roll back the billing state
		// if err != nil {
		//	err = fmt.Errorf("failed to reconcile billing for user %s: %v", userUID, err)
		//	filter := bson.M{
		//		"user_uid": userUID,
		//		"app_type": resources.AppType["LLM-TOKEN"],
		//		"time": bson.M{
		//			"$gte": time.Now().Add(-time.Hour),
		//		},
		//	}
		//	update := bson.M{
		//		"$set": bson.M{
		//			"status": resources.Unsettled,
		//		},
		//	}
		//	if _, rollBackErr := m.MongoDB.getBillingCollection().UpdateMany(context.Background(), filter, update); rollBackErr != nil {
		//		return fmt.Errorf("%v; And failed to rollback billing status: %v", err, rollBackErr)
		//	}
		//	return err
		//}
		if err != nil {
			return fmt.Errorf("failed to reconcile billing for user %s: %w", userUID, err)
		}
	}
	return nil
}

func (m *Account) ArchiveHourlyBilling(hourStart, hourEnd time.Time) error {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"time": bson.M{
				"$gte": hourStart,
				"$lt":  hourEnd,
			},
			"status": resources.Consumed,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"user_uid": "$user_uid",
				"app_type": "$app_type",
				"app_name": "$app_name",
				// "owner":     "$owner",
				"namespace": "$namespace",
			},
			"total_amount": bson.M{"$sum": "$amount"},
		}}},
	}

	cursor, err := m.MongoDB.getActiveBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		helper.ErrorCounter.WithLabelValues("ArchiveHourlyBilling", "Aggregate", "").Inc()
		return fmt.Errorf("failed to aggregate hourly billing: %w", err)
	}
	defer cursor.Close(context.Background())

	var errs []error
	for cursor.Next(context.Background()) {
		var result struct {
			ID struct {
				UserUID   uuid.UUID `bson:"user_uid"`
				AppName   string    `bson:"app_name"`
				AppType   string    `bson:"app_type"`
				Owner     string    `bson:"owner,omitempty"`
				Namespace string    `bson:"namespace"`
			} `bson:"_id"`
			TotalAmount int64 `bson:"total_amount"`
		}

		if err := cursor.Decode(&result); err != nil {
			errs = append(errs, fmt.Errorf("failed to decode document: %w", err))
			continue
		}
		if result.ID.Owner == "" {
			userCr, err := m.ck.GetUserCr(&types.UserQueryOpts{UID: result.ID.UserUID})
			if err != nil {
				helper.ErrorCounter.WithLabelValues("ArchiveHourlyBilling", "GetUserCr", result.ID.UserUID.String()).
					Inc()
				errs = append(errs, fmt.Errorf("failed to get user cr: %w", err))
				continue
			}
			result.ID.Owner = userCr.CrName
		}

		filter := bson.M{
			"app_type":  resources.AppType[result.ID.AppType],
			"app_name":  result.ID.AppName,
			"namespace": result.ID.Namespace,
			"owner":     result.ID.Owner,
			"time":      hourStart,
			"type":      resources.Consumption,
		}

		billing := bson.M{
			"order_id":  gonanoid.Must(12),
			"type":      resources.Consumption,
			"namespace": result.ID.Namespace,
			"app_type":  resources.AppType[result.ID.AppType],
			"app_name":  result.ID.AppName,
			"amount":    result.TotalAmount,
			"owner":     result.ID.Owner,
			"time":      hourStart,
			"status":    resources.Settled,
			"user_uid":  result.ID.UserUID,
		}

		update := bson.M{
			"$setOnInsert": billing,
		}

		opts := options.Update().SetUpsert(true)
		_, err = m.MongoDB.getBillingCollection().UpdateOne(
			context.Background(),
			filter,
			update,
			opts,
		)
		if err != nil {
			helper.ErrorCounter.WithLabelValues("ArchiveHourlyBilling", "UpdateOne", result.ID.UserUID.String()).
				Inc()
			errs = append(errs, fmt.Errorf("failed to upsert billing for user %s, app %s: %w",
				result.ID.UserUID, result.ID.AppName, err))
			continue
		}
	}
	if err = cursor.Err(); err != nil {
		errs = append(errs, fmt.Errorf("cursor error: %w", err))
	}
	if len(errs) > 0 {
		return fmt.Errorf("encountered %d errors during archiving: %v", len(errs), errs)
	}
	return nil
}

func (m *MongoDB) reconcileUnsettledLLMBilling(
	startTime, endTime time.Time,
) (map[uuid.UUID]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"time": bson.M{
				"$gte": startTime,
				"$lte": endTime,
			},
			"status":   resources.Unsettled,
			"app_type": resources.AppType[resources.LLMToken],
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":          "$user_uid",
			"total_amount": bson.M{"$sum": "$amount"},
		}}},
	}
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing: %w", err)
	}
	defer cursor.Close(context.Background())
	result := make(map[uuid.UUID]int64)
	for cursor.Next(context.Background()) {
		var doc struct {
			ID     uuid.UUID `bson:"_id"`
			Amount int64     `bson:"total_amount"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return nil, fmt.Errorf("failed to decode document: %w", err)
		}
		result[doc.ID] = doc.Amount
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}
	return result, nil
}

func (g *Cockroach) RefundAmount(
	ref types.PaymentRefund,
	postDo func(types.PaymentRefund) error,
) error {
	// g.ck.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
	//	// 1. get payment with id，status设置为退款
	//	// 2. 创建 paymentRefund 数据 进行关联
	//	// 3. 更新用户账户余额
	// })
	return g.ck.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
		// 1. 查询原 payment 并设置状态为已退款
		var payment types.Payment
		if err := tx.
			Where("id = ? ", ref.OrderID).
			First(&payment).Error; err != nil {
			return fmt.Errorf("payment not found: %w", err)
		}

		// 状态改为 "refunded"
		payment.Status = types.PaymentStatusRefunded
		if err := tx.Save(&payment).Error; err != nil {
			return fmt.Errorf("failed to update payment status: %w", err)
		}

		// 2. 调用退款接口进行退款
		// 调用退款接口之后返回 OutTradeNo 传入payment_refund

		if ref.RefundNo == "" {
			ref.RefundNo = uuid.NewString()
		}
		// 2. 创建一条 payment_refund 记录
		refund := types.PaymentRefund{
			TradeNo:      payment.TradeNO,  // 自查询
			OrderID:      payment.ID,       // 外键 与payment关联  前端传入
			Method:       payment.Method,   // 前端传入
			RefundNo:     ref.RefundNo,     // 生成传入
			RefundAmount: ref.RefundAmount, // 前端传入
			DeductAmount: ref.DeductAmount, // 前端传入
			RefundReason: ref.RefundReason, // 前端选择传入
		}
		if err := tx.Create(&refund).Error; err != nil {
			log.Printf("创建 refund 时的字段内容: %+v", refund)
			return fmt.Errorf("failed to create payment_refund: %w", err)
		}

		// 用公开方法调用
		if ref.DeductAmount > 0 {
			if err := g.ck.UpdateWithAccount(payment.UserUID, false, false, false, ref.DeductAmount, tx); err != nil {
				return fmt.Errorf("扣款失败：%w", err)
			}
		}
		return postDo(refund)
	})
}

func (g *Cockroach) CreateCorporate(corporate types.Corporate) error {
	return g.ck.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
		if err := g.ck.CreateCorporate(&corporate); err != nil {
			return fmt.Errorf("failed to create corporate: %w", err)
		}
		return nil
	})
}

// UserAlertNotificationAccount implementations

func (g *Cockroach) CreateUserAlertNotificationAccount(account *types.UserAlertNotificationAccount) error {
	return g.ck.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(account).Error; err != nil {
			return fmt.Errorf("failed to create user alert notification account: %w", err)
		}
		return nil
	})
}

func (g *Cockroach) ListUserAlertNotificationAccounts(userUID uuid.UUID) ([]*types.UserAlertNotificationAccount, error) {
	var accounts []*types.UserAlertNotificationAccount
	err := g.ck.GetGlobalDB().Where("user_uid = ?", userUID).Find(&accounts).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list user alert notification accounts: %w", err)
	}
	return accounts, nil
}

func (g *Cockroach) DeleteUserAlertNotificationAccounts(ids []uuid.UUID, userUID uuid.UUID) (int, []string, error) {
	if len(ids) == 0 {
		return 0, nil, nil
	}

	var deletedIDs []string
	err := g.ck.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
		// Get the IDs that will be deleted before actually deleting them
		var accountsToDelete []types.UserAlertNotificationAccount
		if err := tx.Where("id IN ? AND user_uid = ?", ids, userUID).Find(&accountsToDelete).Error; err != nil {
			return fmt.Errorf("failed to find accounts to delete: %w", err)
		}

		// Delete the accounts
		result := tx.Where("id IN ? AND user_uid = ?", ids, userUID).Delete(&types.UserAlertNotificationAccount{})
		if result.Error != nil {
			return fmt.Errorf("failed to delete user alert notification accounts: %w", result.Error)
		}

		// Collect the IDs of deleted accounts
		deletedIDs = make([]string, len(accountsToDelete))
		for i, account := range accountsToDelete {
			deletedIDs[i] = account.ID.String()
		}

		return nil
	})

	if err != nil {
		return 0, nil, err
	}

	return len(deletedIDs), deletedIDs, nil
}

func (g *Cockroach) ToggleUserAlertNotificationAccounts(ids []uuid.UUID, isEnabled bool) (int, []string, error) {
	if len(ids) == 0 {
		return 0, nil, nil
	}

	var updatedIDs []string
	err := g.ck.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
		// Update the IsEnabled field for the specified IDs
		result := tx.Model(&types.UserAlertNotificationAccount{}).
			Where("id IN ?", ids).
			Update("is_enabled", isEnabled)

		if result.Error != nil {
			return fmt.Errorf("failed to toggle user alert notification accounts: %w", result.Error)
		}

		// Get the IDs that were actually updated
		var updatedAccounts []struct {
			ID string `gorm:"column:id"`
		}
		if err := tx.Model(&types.UserAlertNotificationAccount{}).
			Where("id IN ?", ids).
			Pluck("id", &updatedAccounts).Error; err != nil {
			return fmt.Errorf("failed to get updated account IDs: %w", err)
		}

		updatedIDs = make([]string, len(updatedAccounts))
		for i, account := range updatedAccounts {
			updatedIDs[i] = account.ID
		}

		return nil
	})

	if err != nil {
		return 0, nil, err
	}

	return len(updatedIDs), updatedIDs, nil
}
