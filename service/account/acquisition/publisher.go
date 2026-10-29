package acquisition

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const maxAttempts = 10

type activation struct {
	SourceKey string    `gorm:"primaryKey;type:text"`
	CreatedAt time.Time `gorm:"not null"`
}

func (activation) TableName() string { return "acquisition_billing_activations" }

type delivery struct {
	EventID       string    `gorm:"primaryKey;type:text"`
	SourceKey     string    `gorm:"uniqueIndex:acquisition_billing_source_payment;index;not null;type:text"`
	PaymentID     string    `gorm:"uniqueIndex:acquisition_billing_source_payment;not null;type:text"`
	Payload       string    `gorm:"type:text;not null"`
	State         string    `gorm:"index;not null;type:text"`
	Attempts      int       `gorm:"not null;default:0"`
	NextAttemptAt time.Time `gorm:"index;not null"`
	DeliveredAt   *time.Time
	LastError     string `gorm:"type:text"`
}

func (delivery) TableName() string { return "acquisition_billing_deliveries" }

type paymentFact struct {
	ID              string
	UserUID         string `gorm:"column:userUid"`
	CreatedAt       time.Time
	Method          string
	Amount          int64
	TradeNO         string `gorm:"column:trade_no"`
	Type            string
	Status          string
	Workspace       string
	TransactionFrom string `gorm:"column:transaction_from"`
}

type lifecycleEvent struct {
	Version       int            `json:"version"`
	EventID       string         `json:"event_id"`
	EventName     string         `json:"event_name"`
	OccurredAt    time.Time      `json:"occurred_at"`
	SubjectID     string         `json:"subject_id"`
	WorkspaceID   string         `json:"workspace_id,omitempty"`
	TransactionID string         `json:"transaction_id"`
	Realm         string         `json:"realm"`
	Properties    map[string]any `json:"properties"`
}

func billingEvent(f paymentFact, cfg Config, observedAt time.Time) (lifecycleEvent, bool) {
	uid, err := uuid.Parse(f.UserUID)
	if err != nil || uid == uuid.Nil || f.ID == "" || f.TradeNO == "" || f.Status != "PAID" ||
		f.Amount <= 0 ||
		f.CreatedAt.IsZero() {
		return lifecycleEvent{}, false
	}
	// 管理员赠送和邀请赠送不代表用户付费，即使账本写了正数也不回传成功转化。
	if f.TransactionFrom == "admin" || f.TransactionFrom == "referral" {
		return lifecycleEvent{}, false
	}
	name := "topup_success"
	if f.Type == "SUBSCRIPTION" {
		name = "subscribe_success"
	} else if f.Type != "" && f.Type != "ACCOUNT_RECHARGE" {
		return lifecycleEvent{}, false
	}
	// 只接收真实支付账本支持的方法；余额只能表示订阅消费，不能伪装为新的充值收入。
	switch f.Method {
	case "stripe", "wechat", "alipay", "CARD", "BIND_CARD", "card":
	case "balance":
		if name != "subscribe_success" {
			return lifecycleEvent{}, false
		}
	default:
		return lifecycleEvent{}, false
	}
	hash := sha256.Sum256([]byte(cfg.Realm + "\x00" + name + "\x00" + f.TradeNO))
	return lifecycleEvent{
		Version:       1,
		EventID:       "billing:" + hex.EncodeToString(hash[:]),
		EventName:     name,
		OccurredAt:    observedAt.UTC(),
		SubjectID:     uid.String(),
		WorkspaceID:   f.Workspace,
		TransactionID: f.TradeNO,
		Realm:         cfg.Realm,
		Properties: map[string]any{
			"value":             float64(f.Amount) / 1_000_000,
			"currency":          cfg.Currency,
			"method":            f.Method,
			"paying_account_id": uid.String(),
		},
	}, true
}

type Publisher struct {
	db     *gorm.DB
	config Config
	client *http.Client
	now    func() time.Time
}

func NewPublisher(db *gorm.DB, cfg Config) *Publisher {
	return &Publisher{db: db, config: cfg, now: time.Now, client: &http.Client{
		Timeout: 3 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return errors.New("acquisition collector redirects are forbidden")
		},
	}}
}

// Initialize seeds already-paid payment IDs, not pending orders or events. Settlements committed after
// this snapshot remain discoverable even when their order timestamp is older.
func (p *Publisher) Initialize(ctx context.Context) error {
	db := p.db.WithContext(ctx)
	if err := db.AutoMigrate(&activation{}, &delivery{}); err != nil {
		return err
	}
	return db.Transaction(func(tx *gorm.DB) error {
		inserted := tx.Clauses(clause.OnConflict{DoNothing: true}).
			Create(&activation{SourceKey: p.config.sourceKey(), CreatedAt: p.now().UTC()})
		if inserted.Error != nil || inserted.RowsAffected == 0 {
			return inserted.Error
		}
		return tx.Exec(`INSERT INTO acquisition_billing_deliveries
			(event_id, source_key, payment_id, payload, state, attempts, next_attempt_at, last_error)
			SELECT ? || id, ?, id, '', 'ignored', 0, ?, 'historical_not_scheduled'
			FROM "Payment" WHERE "regionUid" = ? AND status = 'PAID'
			ON CONFLICT DO NOTHING`, "historical:"+p.config.sourceKey()+":", p.config.sourceKey(), p.now().UTC(), p.config.RegionID).Error
	})
}

// Capture reads committed payment facts; it never changes the financial ledger.
func (p *Publisher) Capture(ctx context.Context) error {
	return p.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var owner activation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("source_key = ?", p.config.sourceKey()).
			First(&owner).
			Error; err != nil {
			return err
		}
		var facts []paymentFact
		if err := tx.Raw(`SELECT p.id, p."userUid", p.created_at, p.method, p.amount, p.trade_no, p.type, p.status,
			COALESCE(w.workspace, '') AS workspace,
			COALESCE((SELECT st."from" FROM "WorkspaceSubscriptionTransaction" st
				WHERE st.pay_id = p.id ORDER BY st.created_at DESC LIMIT 1), '') AS transaction_from
			FROM "Payment" p
			LEFT JOIN "WorkspaceSubscription" w ON w.id = p.workspace_subscription_id
			LEFT JOIN acquisition_billing_deliveries d ON d.source_key = ? AND d.payment_id = p.id
			WHERE p."regionUid" = ? AND p.status = 'PAID' AND d.event_id IS NULL
			ORDER BY p.created_at, p.id LIMIT 100`, p.config.sourceKey(), p.config.RegionID).
			Scan(&facts).
			Error; err != nil {
			return err
		}
		for _, fact := range facts {
			event, allowed := billingEvent(fact, p.config, p.now())
			row := delivery{
				SourceKey:     p.config.sourceKey(),
				PaymentID:     fact.ID,
				NextAttemptAt: p.now().UTC(),
				State:         "ignored",
				EventID:       "ignored:" + p.config.sourceKey() + ":" + fact.ID,
				LastError:     "unsupported_payment_fact",
			}
			if allowed {
				body, err := json.Marshal(event)
				if err != nil {
					return err
				}
				row.EventID, row.Payload, row.State, row.LastError = event.EventID, string(
					body,
				), "pending", ""
			}
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).
				Create(&row).
				Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (p *Publisher) deliver(ctx context.Context, row delivery) bool {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		p.config.URL,
		bytes.NewBufferString(row.Payload),
	)
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+p.config.Secret)
	req.Header.Set("Content-Type", "application/json")
	resp, err := p.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

// Flush preserves the exact payload across retries. The collector must durably
// deduplicate event IDs when an acknowledgement is lost after acceptance.
func (p *Publisher) Flush(ctx context.Context) error {
	for range 5 {
		processed := false
		err := p.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var row delivery
			found := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
				Where("source_key = ? AND state = 'pending' AND attempts < ? AND next_attempt_at <= ?", p.config.sourceKey(), maxAttempts, p.now()).
				Order("next_attempt_at, event_id").Limit(1).Find(&row)
			if found.Error != nil || found.RowsAffected == 0 {
				return found.Error
			}
			processed = true
			updates := map[string]any{"attempts": row.Attempts + 1}
			if p.deliver(ctx, row) {
				updates["state"], updates["delivered_at"], updates["last_error"] = "delivered", p.now().
					UTC(),
					""
			} else {
				delay := min(time.Hour, time.Minute*time.Duration(1<<row.Attempts))
				updates["next_attempt_at"], updates["last_error"] = p.now().
					Add(delay).
					UTC(),
					"collector_unavailable"
				if row.Attempts+1 >= maxAttempts {
					updates["state"] = "exhausted"
				}
			}
			return tx.Model(&delivery{}).Where("event_id = ?", row.EventID).Updates(updates).Error
		})
		if err != nil {
			return err
		}
		if !processed {
			return nil
		}
	}
	return nil
}

// Run is optional and isolated from payment request handling. Failed batches
// remain durable; errors expose a category rather than payloads or credentials.
func (p *Publisher) Run(ctx context.Context, report func(string)) {
	if err := p.Initialize(ctx); err != nil {
		report("acquisition billing initialization failed")
		return
	}
	tick := time.NewTicker(time.Minute)
	defer tick.Stop()
	for {
		if err := p.Capture(ctx); err != nil {
			report("acquisition billing fact capture failed")
		}
		if err := p.Flush(ctx); err != nil {
			report("acquisition billing delivery batch failed")
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}
