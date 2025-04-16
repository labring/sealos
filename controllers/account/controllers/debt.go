package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"text/template"
	"time"

	dlock "github.com/labring/sealos/controllers/pkg/utils/lock"

	"github.com/labring/sealos/controllers/pkg/utils"

	v1 "github.com/labring/sealos/controllers/account/api/v1"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
)

func (r *DebtReconciler) Start(ctx context.Context) error {
	lock := dlock.NewDistributedLock(r.AccountV2.GetGlobalDB(), "debt_reconciler", r.processID)
	if err := lock.TryLock(context.Background(), 15*time.Second); err != nil {
		if err == dlock.ErrLockNotAcquired {
			time.Sleep(5 * time.Second)
			return r.Start(ctx)
		}
	}
	defer func() {
		if err := lock.Unlock(); err != nil {
			log.Printf("failed to unlock: %v", err)
		}
	}()
	log.Printf("debt reconciler lock acquired, process ID: %s", r.processID)
	r.start()
	log.Printf("debt reconciler started")
	return nil
}

func (r *DebtReconciler) start() {
	db := r.AccountV2.GetGlobalDB()
	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		r.processWithTimeRange(&types.Account{}, "updated_at", 1*time.Minute, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
			users := getUniqueUsers(db, &types.Account{}, "updated_at", start, end)
			if len(users) > 0 {
				r.Logger.Info("processed account updates", "count", len(users), "users", users, "start", start, "end", end)
				r.processUsersInParallel(users)
			}
		})
	}()

	// 1.2 the arrears are transferred to the clearing state
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(1 * time.Hour)
		for range ticker.C {
			var users []uuid.UUID
			if err := db.Model(&types.Debt{}).Where("account_debt_status = ? AND updated_at < ?", types.DebtPeriod, time.Now().UTC().Add(-7*24*time.Hour)).
				Distinct("user_uid").Pluck("user_uid", &users).Error; err != nil {
				r.Logger.Error(err, "failed to query unique users", "account_debt_status", types.DebtPeriod, "updated_at", time.Now().Add(-7*24*time.Hour))
				continue
			}
			if len(users) > 0 {
				r.processUsersInParallel(users)
				r.Logger.Info("processed debt status", "count", len(users), "updated_at", time.Now().Add(-7*24*time.Hour))
			}
		}
	}()

	// 1.3 clearing changes to delete state
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(1 * time.Hour)
		for range ticker.C {
			var users []uuid.UUID
			if err := db.Model(&types.Debt{}).Where("account_debt_status = ? AND updated_at < ?", types.DebtDeletionPeriod, time.Now().UTC().Add(-7*24*time.Hour)).
				Distinct("user_uid").Pluck("user_uid", &users).Error; err != nil {
				r.Logger.Error(err, "failed to query unique users", "account_debt_status", types.DebtPeriod, "updated_at", time.Now().Add(-7*24*time.Hour))
				continue
			}
			if len(users) > 0 {
				r.processUsersInParallel(users)
				r.Logger.Info("processed debt status", "count", len(users), "updated_at", time.Now().Add(-7*24*time.Hour))
			}
		}
	}()

	// 2.1 recharge record processing
	//wg.Add(1)
	//go func() {
	//	defer wg.Done()
	//	r.processWithTimeRange(&types.Payment{}, "created_at", 1*time.Minute, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
	//		users := getUniqueUsers(db, &types.Payment{}, "created_at", start, end)
	//		if len(users) > 0 {
	//			r.processUsersInParallel(users)
	//			r.Logger.Info("processed payment records", "count", len(users), "users", users, "start", start, "end", end)
	//		}
	//	})
	//}()

	// 2.2 subscription change processing
	wg.Add(1)
	go func() {
		defer wg.Done()
		r.processWithTimeRange(&types.Subscription{}, "update_at", 1*time.Minute, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
			users := getUniqueUsers(db, &types.Subscription{}, "update_at", start, end)
			if len(users) > 0 {
				r.processUsersInParallel(users)
				r.Logger.Info("processed subscription changes", "count", len(users), "users", users, "start", start, "end", end)
			}
		})
	}()

	// 2.3 credits refresh processing
	wg.Add(1)
	go func() {
		defer wg.Done()
		r.processWithTimeRange(&types.Credits{}, "created_at", 1*time.Minute, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
			users := getUniqueUsers(db, &types.Credits{}, "created_at", start, end)
			if len(users) > 0 {
				r.processUsersInParallel(users)
				r.Logger.Info("processed credits refresh", "count", len(users), "users", users, "start", start, "end", end)
			}
		})
	}()

	wg.Wait()
}

func (r *DebtReconciler) refreshDebtStatus(userUID uuid.UUID) error {
	account, err := r.AccountV2.GetAccountWithCredits(userUID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to get account %s: %v", userUID, err)
	}
	if account == nil {
		return fmt.Errorf("account %s not found", userUID)
	}
	debt := types.Debt{}
	err = r.AccountV2.GetGlobalDB().Model(&types.Debt{}).Where("user_uid = ?", userUID).First(&debt).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to get debt %s: %v", userUID, err)
	}
	if err == gorm.ErrRecordNotFound {
		return nil
	}
	isBasicUser := account.Balance <= 10*BaseUnit
	oweamount := account.Balance - account.DeductionBalance + account.UsableCredits
	//update interval seconds
	updateIntervalSeconds := time.Now().UTC().Unix() - debt.UpdatedAt.UTC().Unix()
	lastStatus := debt.AccountDebtStatus
	update := false
	if lastStatus == "" {
		lastStatus = types.NormalPeriod
		update = true
	}
	currentStatusRaw, err := r.DetermineCurrentStatus(oweamount, account.UserUID, updateIntervalSeconds, v1.DebtStatusType(lastStatus))
	if err != nil {
		return fmt.Errorf("failed to determine current status for user %s: %v", userUID, err)
	}
	currentStatus := types.DebtStatusType(currentStatusRaw)
	if lastStatus == currentStatus && !update {
		return nil
	}
	if lastStatus != currentStatus {
		if err := r.sendFlushDebtResourceStatusRequest(AdminFlushResourceStatusReq{
			UserUID:           userUID,
			LastDebtStatus:    lastStatus,
			CurrentDebtStatus: currentStatus,
			IsBasicUser:       isBasicUser,
		}); err != nil {
			return fmt.Errorf("failed to send flush resource status request: %w", err)
		}
	}

	switch lastStatus {
	case types.NormalPeriod, types.LowBalancePeriod, types.CriticalBalancePeriod:
		if types.ContainDebtStatus(types.DebtStates, currentStatus) {
			// resume user account
			if err = r.ResumeBalance(userUID); err != nil {
				return fmt.Errorf("failed to resume balance: %w", err)
			}
		}
		if types.StatusMap[currentStatus] > types.StatusMap[lastStatus] {
			//TODO send sms
			if err := r.SendUserDebtMsg(userUID, oweamount, currentStatus, isBasicUser); err != nil {
				return fmt.Errorf("failed to send user debt message: %w", err)
			}
		}
	case types.DebtPeriod, types.DebtDeletionPeriod, types.FinalDeletionPeriod: // The current status may be: (Normal, LowBalance, CriticalBalance) Period [Service needs to be restored], DebtDeletionPeriod [Service suspended]
		if types.ContainDebtStatus(types.DebtStates, currentStatus) {
			if err = r.ResumeBalance(userUID); err != nil {
				return fmt.Errorf("failed to resume balance: %w", err)
			}
		}
		if currentStatus != types.FinalDeletionPeriod {
			// TODO send sms
			if err := r.SendUserDebtMsg(userUID, oweamount, currentStatus, isBasicUser); err != nil {
				return fmt.Errorf("failed to send user debt message: %w", err)
			}
		}
	}

	r.Logger.V(1).Info("update debt status", "account", debt.UserUID,
		"last status", lastStatus, "last update time", debt.UpdatedAt.Format(time.RFC3339),
		"current status", debt.AccountDebtStatus, "time", time.Now().UTC().Format(time.RFC3339))

	debt.AccountDebtStatus = currentStatus
	debt.UpdatedAt = time.Now()

	debtRecord := types.DebtStatusRecord{
		ID:            uuid.New(),
		UserUID:       userUID,
		LastStatus:    lastStatus,
		CurrentStatus: currentStatus,
		CreateAt:      time.Now().UTC(),
	}
	err = r.AccountV2.GlobalTransactionHandler(func(tx *gorm.DB) error {
		dErr := tx.Model(&types.Debt{}).Where("user_uid = ?", userUID).Save(debt).Error
		if dErr != nil {
			return fmt.Errorf("failed to save debt: %w", dErr)
		}
		sErr := tx.Model(&types.DebtStatusRecord{}).Create(&debtRecord).Error
		if sErr != nil {
			return fmt.Errorf("failed to save debt status record: %w", sErr)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to save debt status: %w", err)
	}
	return nil
}

func (r *DebtReconciler) ResumeBalance(userUID uuid.UUID) error {
	account, err := r.AccountV2.GetAccount(&types.UserQueryOpts{UID: userUID})
	if err != nil {
		return fmt.Errorf("failed to get account %s: %w", userUID, err)
	}
	if account.DeductionBalance <= account.Balance {
		return nil
	}
	err = r.AccountV2.GlobalTransactionHandler(func(tx *gorm.DB) error {
		result := tx.Model(&types.Account{}).Where(`"userUid" = ?`, userUID).Where(`"deduction_balance" > "balance"`).Updates(map[string]interface{}{
			"deduction_balance": gorm.Expr("balance"),
		})
		if result.Error != nil {
			return fmt.Errorf("failed to update account balance: %w", result.Error)
		}
		if result.RowsAffected > 0 {
			return tx.Create(&types.DebtResumeDeductionBalanceTransaction{
				UserUID:                userUID,
				BeforeDeductionBalance: account.DeductionBalance,
				AfterDeductionBalance:  account.Balance,
				BeforeBalance:          account.Balance,
			}).Error
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to update account balance: %w", err)
	}
	return nil
}

func (r *DebtReconciler) SendUserDebtMsg(userUID uuid.UUID, oweamount int64, currentStatus types.DebtStatusType, isBasicUser bool) error {
	if r.SmsConfig == nil && r.VmsConfig == nil && r.smtpConfig == nil {
		return nil
	}
	emailTmpl, ok := r.SendDebtStatusEmailBody[v1.DebtStatusType(currentStatus)]
	if !ok {
		return nil
	}
	if isBasicUser && currentStatus == types.CriticalBalancePeriod {
		return nil
	}
	_user, err := r.AccountV2.GetUser(&types.UserQueryOpts{UID: userUID})
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	// skip abnormal user
	if _user.Status != types.UserStatusNormal {
		return nil
	}
	outh, err := r.AccountV2.GetUserOauthProvider(&types.UserQueryOpts{UID: _user.UID, ID: _user.ID})
	if err != nil {
		return fmt.Errorf("failed to get user oauth provider: %w", err)
	}
	phone, email := "", ""
	for i := range outh {
		if outh[i].ProviderType == types.OauthProviderTypePhone {
			phone = outh[i].ProviderID
		} else if outh[i].ProviderType == types.OauthProviderTypeEmail {
			email = outh[i].ProviderID
		}
	}
	fmt.Printf("user: %s, phone: %s, email: %s\n", userUID, phone, email)
	//if phone != "" {
	//	if r.SmsConfig != nil && r.SmsConfig.SmsCode[noticeType] != "" {
	//		oweamount := strconv.FormatInt(int64(math.Abs(math.Ceil(float64(oweAmount)/1_000_000))), 10)
	//		err = utils.SendSms(r.SmsConfig.Client, &client2.SendSmsRequest{
	//			PhoneNumbers: tea.String(phone),
	//			SignName:     tea.String(r.SmsConfig.SmsSignName),
	//			TemplateCode: tea.String(r.SmsConfig.SmsCode[noticeType]),
	//			// ｜ownAmount/1_000_000｜
	//			TemplateParam: tea.String("{\"user_id\":\"" + user + "\",\"oweamount\":\"" + oweamount + "\"}"),
	//		})
	//		if err != nil {
	//			return fmt.Errorf("failed to send sms notice: %w", err)
	//		}
	//	}
	//	if r.VmsConfig != nil && noticeType == WarningNotice && r.VmsConfig.TemplateCode[noticeType] != "" {
	//		err = utils.SendVms(phone, r.VmsConfig.TemplateCode[noticeType], r.VmsConfig.NumberPoll, GetSendVmsTimeInUTCPlus8(time.Now()), forbidTimes)
	//		if err != nil {
	//			return fmt.Errorf("failed to send vms notice: %w", err)
	//		}
	//	}
	//}
	if r.smtpConfig != nil && email != "" {
		var emailBody string
		var emailSubject = "Low Account Balance Reminder"
		if SubscriptionEnabled {
			var userInfo types.UserInfo
			err = r.AccountV2.GetGlobalDB().Where(types.UserInfo{UserUID: userUID}).Find(&userInfo).Error
			if err != nil {
				return fmt.Errorf("failed to get user info: %w", err)
			}
			emailRender := &utils.EmailDebtRender{
				Type:          string(currentStatus),
				CurrentStatus: currentStatus,
				Domain:        r.AccountV2.GetLocalRegion().Domain,
			}
			if types.ContainDebtStatus(types.DebtStates, currentStatus) {
				if oweamount <= 0 {
					emailRender.GraceReason = []string{string(utils.GraceReasonNoBalance)}
				} else {
					emailRender.GraceReason = []string{string(utils.GraceReasonSubExpired)}
				}
			}
			emailRender.SetUserInfo(&userInfo)

			tmp, err := template.New("debt-reconcile").Parse(emailTmpl)
			if err != nil {
				return fmt.Errorf("failed to parse email template: %w", err)
			}
			var rendered bytes.Buffer
			if err = tmp.Execute(&rendered, emailRender.Build()); err != nil {
				return fmt.Errorf("failed to render email template: %w", err)
			}
			emailBody = rendered.String()
			emailSubject = emailRender.GetSubject()
		} else {
			emailBody = emailTmpl
		}
		if err = r.smtpConfig.SendEmailWithTitle(emailSubject, emailBody, email); err != nil {
			return fmt.Errorf("failed to send email notice: %w", err)
		}
	}
	return nil
}

type AdminFlushResourceStatusReq struct {
	UserUID           uuid.UUID            `json:"userUID" bson:"userUID"`
	LastDebtStatus    types.DebtStatusType `json:"lastDebtStatus" bson:"lastDebtStatus"`
	CurrentDebtStatus types.DebtStatusType `json:"currentDebtStatus" bson:"currentDebtStatus"`
	IsBasicUser       bool                 `json:"isBasicUser" bson:"isBasicUser"`
}

// TODO flush desktop message (send or read) && flush resource quota (suspend or resume or delete)
func (r *DebtReconciler) sendFlushDebtResourceStatusRequest(quotaReq AdminFlushResourceStatusReq) error {
	for _, domain := range r.allRegionDomain {
		token, err := r.jwtManager.GenerateToken(utils.JwtUser{
			Requester: AdminUserName,
		})
		if err != nil {
			return fmt.Errorf("failed to generate token: %w", err)
		}

		url := fmt.Sprintf("https://account-api.%s/admin/v1alpha1/flush-debt-resource-status", domain)

		quotaReqBody, err := json.Marshal(quotaReq)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}

		var lastErr error
		backoffTime := time.Second

		maxRetries := 3
		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", url, bytes.NewBuffer(quotaReqBody))
			if err != nil {
				return fmt.Errorf("failed to create request: %w", err)
			}

			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			client := http.Client{}

			resp, err := client.Do(req)
			if err != nil {
				lastErr = fmt.Errorf("failed to send request: %w", err)
			} else {
				defer resp.Body.Close()

				if resp.StatusCode == http.StatusOK {
					lastErr = nil
					break
				}
				lastErr = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			}

			// 进行重试
			if attempt < maxRetries {
				fmt.Printf("Attempt %d failed: %v. Retrying in %v...\n", attempt, lastErr, backoffTime)
				time.Sleep(backoffTime)
				backoffTime *= 2 // 指数增长退避时间
			}
		}
		if lastErr != nil {
			return lastErr
		}
	}
	return nil
}

// 获取时间范围内的不重复用户 UUID
func getUniqueUsers(db *gorm.DB, table interface{}, timeField string, startTime, endTime time.Time) []uuid.UUID {
	var users []uuid.UUID
	switch table.(type) {
	case *types.AccountTransaction, *types.Payment, *types.Account:
		if err := db.Model(table).Where(fmt.Sprintf("%s BETWEEN ? AND ?", timeField), startTime, endTime).
			Distinct(`"userUid"`).Pluck(`"userUid"`, &users).Error; err != nil {
			log.Printf("failed to query unique users: %v", err)
			return nil
		}
	default:
		if err := db.Model(table).Where(fmt.Sprintf("%s BETWEEN ? AND ?", timeField), startTime, endTime).
			Distinct("user_uid").Pluck("user_uid", &users).Error; err != nil {
			log.Printf("failed to query unique users: %v", err)
			return nil
		}
	}
	return users
}

// Parallel processing of user debt status, the same user simultaneously through the lock to implement a debt refresh processing.
func (r *DebtReconciler) processUsersInParallel(users []uuid.UUID) {
	var (
		wg        sync.WaitGroup
		semaphore = make(chan struct{}, 100)
	)

	for _, user := range users {
		wg.Add(1)
		semaphore <- struct{}{}
		go func(u uuid.UUID) {
			defer wg.Done()
			defer func() { <-semaphore }()
			lock, _ := r.userLocks.LoadOrStore(u, &sync.Mutex{})
			mutex := lock.(*sync.Mutex)
			if !mutex.TryLock() {
				r.Logger.Info("user debt processing skipped due to existing lock",
					"userUID", u)
				return
			}
			defer mutex.Unlock()
			if err := r.refreshDebtStatus(u); err != nil {
				r.Logger.Error(err, fmt.Sprintf("failed to refresh debt status for user %s", u))
			}
		}(user)
	}
	wg.Wait()
}

// 时间区间轮询处理
func (r *DebtReconciler) processWithTimeRange(table interface{}, timeField string, interval time.Duration, initialDuration time.Duration, processFunc func(*gorm.DB, time.Time, time.Time)) {
	// 首次处理
	startTime := time.Now().Add(-initialDuration)
	endTime := time.Now().Add(-2 * time.Minute)
	users := getUniqueUsers(r.AccountV2.GetGlobalDB(), table, timeField, startTime, endTime)
	r.processUsersInParallel(users)
	r.Logger.Info("processed table updates", "table", fmt.Sprintf("%T", table), "count", len(users), "start", startTime, "end", endTime)

	// 后续按时间区间轮询
	lastEndTime := endTime
	ticker := time.NewTicker(interval)
	for range ticker.C {
		startTime = lastEndTime
		endTime = time.Now().Add(-interval)
		processFunc(r.AccountV2.GetGlobalDB(), startTime, endTime)
		lastEndTime = endTime
	}
}
