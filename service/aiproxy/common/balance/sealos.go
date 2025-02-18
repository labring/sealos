package balance

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/env"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
)

const (
	defaultAccountURL     = "http://account-service.account-system.svc.cluster.local:2333"
	balancePrecision      = 1000000
	appType               = "LLM-TOKEN"
	sealosRequester       = "sealos-admin"
	sealosGroupBalanceKey = "sealos:balance:%s"
	sealosUserRealNameKey = "sealos:realName:%s"
	getBalanceRetry       = 3
)

var (
	_                       GroupBalance = (*Sealos)(nil)
	sealosHTTPClient                     = &http.Client{}
	decimalBalancePrecision              = decimal.NewFromInt(balancePrecision)
	minConsumeAmount                     = decimal.NewFromInt(1)
	jwtToken                string
	sealosRedisCacheEnable  = env.Bool("BALANCE_SEALOS_REDIS_CACHE_ENABLE", true)
	sealosCacheExpire       = 3 * time.Minute
)

var (
	sealosCheckRealNameEnable       = env.Bool("BALANCE_SEALOS_CHECK_REAL_NAME_ENABLE", false)
	sealosNoRealNameUsedAmountLimit = env.Float64("BALANCE_SEALOS_NO_REAL_NAME_USED_AMOUNT_LIMIT", 1)
)

type Sealos struct {
	accountURL string
}

// FIXME: 如果获取余额能成功，但是消费永远失败，需要加一个失败次数限制，如果失败次数超过一定阈值，暂停服务
func InitSealos(jwtKey string, accountURL string) error {
	token, err := newSealosToken(jwtKey)
	if err != nil {
		return fmt.Errorf("failed to generate sealos jwt token: %w", err)
	}
	jwtToken = token
	Default = NewSealos(accountURL)
	return nil
}

func NewSealos(accountURL string) *Sealos {
	if accountURL == "" {
		accountURL = defaultAccountURL
	}
	return &Sealos{accountURL: accountURL}
}

type sealosClaims struct {
	Requester string `json:"requester"`
	jwt.RegisteredClaims
}

func newSealosToken(key string) (string, error) {
	claims := &sealosClaims{
		Requester: sealosRequester,
		RegisteredClaims: jwt.RegisteredClaims{
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(conv.StringToBytes(key))
}

type sealosGetGroupBalanceResp struct {
	UserUID string `json:"userUID"`
	Error   string `json:"error"`
	Balance int64  `json:"balance"`
}

type sealosPostGroupConsumeReq struct {
	Namespace string `json:"namespace"`
	AppType   string `json:"appType"`
	AppName   string `json:"appName"`
	UserUID   string `json:"userUID"`
	Amount    int64  `json:"amount"`
}

type sealosPostGroupConsumeResp struct {
	Error string `json:"error"`
}

type sealosCache struct {
	UserUID string `redis:"u"`
	Balance int64  `redis:"b"`
}

//nolint:gosec
func cacheSetGroupBalance(ctx context.Context, group string, balance int64, userUID string) error {
	if !common.RedisEnabled || !sealosRedisCacheEnable {
		return nil
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	pipe := common.RDB.Pipeline()
	pipe.HSet(ctx, fmt.Sprintf(sealosGroupBalanceKey, group), sealosCache{
		Balance: balance,
		UserUID: userUID,
	})
	expireTime := sealosCacheExpire + time.Duration(rand.Int64N(10)-5)*time.Second
	pipe.Expire(ctx, fmt.Sprintf(sealosGroupBalanceKey, group), expireTime)
	_, err := pipe.Exec(ctx)
	return err
}

func cacheGetGroupBalance(ctx context.Context, group string) (*sealosCache, error) {
	if !common.RedisEnabled || !sealosRedisCacheEnable {
		return nil, redis.Nil
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	var cache sealosCache
	if err := common.RDB.HGetAll(ctx, fmt.Sprintf(sealosGroupBalanceKey, group)).Scan(&cache); err != nil {
		return nil, err
	}
	return &cache, nil
}

var decreaseGroupBalanceScript = redis.NewScript(`
	local balance = redis.call("HGet", KEYS[1], "balance")
	if balance == false then
		return redis.status_reply("ok")
	end
	redis.call("HSet", KEYS[1], "balance", balance - ARGV[1])
	return redis.status_reply("ok")
`)

func cacheDecreaseGroupBalance(ctx context.Context, group string, amount int64) error {
	if !common.RedisEnabled || !sealosRedisCacheEnable {
		return nil
	}
	return decreaseGroupBalanceScript.Run(ctx, common.RDB, []string{fmt.Sprintf(sealosGroupBalanceKey, group)}, amount).Err()
}

var ErrNoRealNameUsedAmountLimit = errors.New("达到未实名用户使用额度限制，请实名认证")

func (s *Sealos) GetGroupRemainBalance(ctx context.Context, group model.GroupCache) (float64, PostGroupConsumer, error) {
	var errs []error
	for i := 0; ; i++ {
		balance, userUID, err := s.getGroupRemainBalance(ctx, group.ID)
		if err == nil {
			if sealosCheckRealNameEnable &&
				group.UsedAmount > sealosNoRealNameUsedAmountLimit &&
				!s.checkRealName(ctx, userUID) {
				return 0, nil, ErrNoRealNameUsedAmountLimit
			}
			return decimal.NewFromInt(balance).Div(decimalBalancePrecision).InexactFloat64(),
				newSealosPostGroupConsumer(s.accountURL, group.ID, userUID), nil
		}
		errs = append(errs, err)
		if i == getBalanceRetry-1 {
			return 0, nil, errors.Join(errs...)
		}
		time.Sleep(time.Second)
	}
}

func cacheGetUserRealName(ctx context.Context, userUID string) (bool, error) {
	if !common.RedisEnabled || !sealosRedisCacheEnable {
		return true, redis.Nil
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	realName, err := common.RDB.Get(ctx, fmt.Sprintf(sealosUserRealNameKey, userUID)).Bool()
	if err != nil {
		return false, err
	}
	return realName, nil
}

func cacheSetUserRealName(ctx context.Context, userUID string, realName bool) error {
	if !common.RedisEnabled || !sealosRedisCacheEnable {
		return nil
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	var expireTime time.Duration
	if realName {
		expireTime = time.Hour * 12
	} else {
		expireTime = time.Minute * 1
	}
	return common.RDB.Set(ctx, fmt.Sprintf(sealosUserRealNameKey, userUID), realName, expireTime).Err()
}

func (s *Sealos) checkRealName(ctx context.Context, userUID string) bool {
	if cache, err := cacheGetUserRealName(ctx, userUID); err == nil {
		return cache
	} else if !errors.Is(err, redis.Nil) {
		log.Errorf("get user (%s) real name cache failed: %s", userUID, err)
	}

	realName, err := s.fetchRealNameFromAPI(ctx, userUID)
	if err != nil {
		log.Errorf("fetch user (%s) real name failed: %s", userUID, err)
		return true
	}

	if err := cacheSetUserRealName(ctx, userUID, realName); err != nil {
		log.Errorf("set user (%s) real name cache failed: %s", userUID, err)
	}

	return realName
}

type sealosGetRealNameInfoResp struct {
	IsRealName bool   `json:"isRealName"`
	Error      string `json:"error"`
}

func (s *Sealos) fetchRealNameFromAPI(ctx context.Context, userUID string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/admin/v1alpha1/real-name-info?userUID=%s", s.accountURL, userUID), nil)
	if err != nil {
		return false, err
	}

	req.Header.Set("Authorization", "Bearer "+jwtToken)
	resp, err := sealosHTTPClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var sealosResp sealosGetRealNameInfoResp
	if err := json.NewDecoder(resp.Body).Decode(&sealosResp); err != nil {
		return false, err
	}

	if resp.StatusCode != http.StatusOK || sealosResp.Error != "" {
		return false, fmt.Errorf("get user (%s) real name failed with status code %d, error: %s", userUID, resp.StatusCode, sealosResp.Error)
	}

	return sealosResp.IsRealName, nil
}

// GroupBalance interface implementation
func (s *Sealos) getGroupRemainBalance(ctx context.Context, group string) (int64, string, error) {
	if cache, err := cacheGetGroupBalance(ctx, group); err == nil && cache.UserUID != "" {
		return cache.Balance, cache.UserUID, nil
	} else if err != nil && !errors.Is(err, redis.Nil) {
		log.Errorf("get group (%s) balance cache failed: %s", group, err)
	}

	balance, userUID, err := s.fetchBalanceFromAPI(ctx, group)
	if err != nil {
		return 0, "", err
	}

	if err := cacheSetGroupBalance(ctx, group, balance, userUID); err != nil {
		log.Errorf("set group (%s) balance cache failed: %s", group, err)
	}

	return balance, userUID, nil
}

func (s *Sealos) fetchBalanceFromAPI(ctx context.Context, group string) (balance int64, userUID string, err error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/admin/v1alpha1/account-with-workspace?namespace=%s", s.accountURL, group), nil)
	if err != nil {
		return 0, "", err
	}

	req.Header.Set("Authorization", "Bearer "+jwtToken)
	resp, err := sealosHTTPClient.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	var sealosResp sealosGetGroupBalanceResp
	if err := json.NewDecoder(resp.Body).Decode(&sealosResp); err != nil {
		return 0, "", err
	}

	if sealosResp.Error != "" {
		return 0, "", errors.New(sealosResp.Error)
	}

	if resp.StatusCode != http.StatusOK {
		return 0, "", fmt.Errorf("get group (%s) balance failed with status code %d", group, resp.StatusCode)
	}

	return sealosResp.Balance, sealosResp.UserUID, nil
}

type SealosPostGroupConsumer struct {
	accountURL string
	group      string
	uid        string
}

func newSealosPostGroupConsumer(accountURL, group, uid string) *SealosPostGroupConsumer {
	return &SealosPostGroupConsumer{
		accountURL: accountURL,
		group:      group,
		uid:        uid,
	}
}

func (s *SealosPostGroupConsumer) PostGroupConsume(ctx context.Context, tokenName string, usage float64) (float64, error) {
	amount := s.calculateAmount(usage)

	if err := cacheDecreaseGroupBalance(ctx, s.group, amount.IntPart()); err != nil {
		log.Errorf("decrease group (%s) balance cache failed: %s", s.group, err)
	}

	if err := s.postConsume(ctx, amount.IntPart(), tokenName); err != nil {
		return 0, err
	}

	return amount.Div(decimalBalancePrecision).InexactFloat64(), nil
}

func (s *SealosPostGroupConsumer) calculateAmount(usage float64) decimal.Decimal {
	amount := decimal.NewFromFloat(usage).Mul(decimalBalancePrecision).Ceil()
	if amount.LessThan(minConsumeAmount) {
		amount = minConsumeAmount
	}
	return amount
}

func (s *SealosPostGroupConsumer) postConsume(ctx context.Context, amount int64, tokenName string) error {
	reqBody, err := json.Marshal(sealosPostGroupConsumeReq{
		Namespace: s.group,
		Amount:    amount,
		AppType:   appType,
		AppName:   tokenName,
		UserUID:   s.uid,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx,
		http.MethodPost,
		s.accountURL+"/admin/v1alpha1/charge-billing",
		bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+jwtToken)
	resp, err := sealosHTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var sealosResp sealosPostGroupConsumeResp
	if err := json.NewDecoder(resp.Body).Decode(&sealosResp); err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK || sealosResp.Error != "" {
		return fmt.Errorf("status code: %d, error: %s", resp.StatusCode, sealosResp.Error)
	}

	return nil
}
