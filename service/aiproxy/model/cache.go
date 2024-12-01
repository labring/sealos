package model

import (
	"context"
	"encoding"
	"errors"
	"fmt"
	"math/rand/v2"
	"slices"
	"sort"
	"sync"
	"time"

	json "github.com/json-iterator/go"
	"github.com/maruel/natural"
	"github.com/redis/go-redis/v9"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/logger"
)

const (
	SyncFrequency = time.Minute * 3
	TokenCacheKey = "token:%s"
	GroupCacheKey = "group:%s"
)

var (
	_ encoding.BinaryMarshaler = (*redisStringSlice)(nil)
	_ redis.Scanner            = (*redisStringSlice)(nil)
)

type redisStringSlice []string

func (r *redisStringSlice) ScanRedis(value string) error {
	return json.Unmarshal(conv.StringToBytes(value), r)
}

func (r redisStringSlice) MarshalBinary() ([]byte, error) {
	return json.Marshal(r)
}

type redisTime time.Time

func (t *redisTime) ScanRedis(value string) error {
	return (*time.Time)(t).UnmarshalBinary(conv.StringToBytes(value))
}

func (t redisTime) MarshalBinary() ([]byte, error) {
	return time.Time(t).MarshalBinary()
}

type TokenCache struct {
	ExpiredAt  redisTime        `json:"expired_at"  redis:"e"`
	Group      string           `json:"group"       redis:"g"`
	Key        string           `json:"-"           redis:"-"`
	Name       string           `json:"name"        redis:"n"`
	Subnet     string           `json:"subnet"      redis:"s"`
	Models     redisStringSlice `json:"models"      redis:"m"`
	ID         int              `json:"id"          redis:"i"`
	Status     int              `json:"status"      redis:"st"`
	Quota      float64          `json:"quota"       redis:"q"`
	UsedAmount float64          `json:"used_amount" redis:"u"`
}

func (t *Token) ToTokenCache() *TokenCache {
	return &TokenCache{
		ID:         t.ID,
		Group:      t.GroupID,
		Name:       t.Name.String(),
		Models:     t.Models,
		Subnet:     t.Subnet,
		Status:     t.Status,
		ExpiredAt:  redisTime(t.ExpiredAt),
		Quota:      t.Quota,
		UsedAmount: t.UsedAmount,
	}
}

func CacheDeleteToken(key string) error {
	if !common.RedisEnabled {
		return nil
	}
	return common.RedisDel(fmt.Sprintf(TokenCacheKey, key))
}

//nolint:gosec
func CacheSetToken(token *Token) error {
	if !common.RedisEnabled {
		return nil
	}
	key := fmt.Sprintf(TokenCacheKey, token.Key)
	pipe := common.RDB.Pipeline()
	pipe.HSet(context.Background(), key, token.ToTokenCache())
	expireTime := SyncFrequency + time.Duration(rand.Int64N(60)-30)*time.Second
	pipe.Expire(context.Background(), key, expireTime)
	_, err := pipe.Exec(context.Background())
	return err
}

func CacheGetTokenByKey(key string) (*TokenCache, error) {
	if !common.RedisEnabled {
		token, err := GetTokenByKey(key)
		if err != nil {
			return nil, err
		}
		return token.ToTokenCache(), nil
	}

	cacheKey := fmt.Sprintf(TokenCacheKey, key)
	tokenCache := &TokenCache{}
	err := common.RDB.HGetAll(context.Background(), cacheKey).Scan(tokenCache)
	if err == nil && tokenCache.ID != 0 {
		tokenCache.Key = key
		return tokenCache, nil
	} else if err != nil && !errors.Is(err, redis.Nil) {
		logger.SysLogf("get token (%s) from redis error: %s", key, err.Error())
	}

	token, err := GetTokenByKey(key)
	if err != nil {
		return nil, err
	}

	if err := CacheSetToken(token); err != nil {
		logger.SysError("redis set token error: " + err.Error())
	}

	return token.ToTokenCache(), nil
}

var updateTokenUsedAmountScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "used_amount") then
		redis.call("HSet", KEYS[1], "used_amount", ARGV[1])
	end
	return redis.status_reply("ok")
`)

var updateTokenUsedAmountOnlyIncreaseScript = redis.NewScript(`
	local used_amount = redis.call("HGet", KEYS[1], "used_amount")
	if used_amount == false then
		return redis.status_reply("ok")
	end
	if ARGV[1] < used_amount then
		return redis.status_reply("ok")
	end
	redis.call("HSet", KEYS[1], "used_amount", ARGV[1])
	return redis.status_reply("ok")
`)

var increaseTokenUsedAmountScript = redis.NewScript(`
	local used_amount = redis.call("HGet", KEYS[1], "used_amount")
	if used_amount == false then
		return redis.status_reply("ok")
	end
	redis.call("HSet", KEYS[1], "used_amount", used_amount + ARGV[1])
	return redis.status_reply("ok")
`)

func CacheUpdateTokenUsedAmount(key string, amount float64) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateTokenUsedAmountScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(TokenCacheKey, key)}, amount).Err()
}

func CacheUpdateTokenUsedAmountOnlyIncrease(key string, amount float64) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateTokenUsedAmountOnlyIncreaseScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(TokenCacheKey, key)}, amount).Err()
}

func CacheIncreaseTokenUsedAmount(key string, amount float64) error {
	if !common.RedisEnabled {
		return nil
	}
	return increaseTokenUsedAmountScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(TokenCacheKey, key)}, amount).Err()
}

type GroupCache struct {
	ID     string `json:"-"      redis:"-"`
	Status int    `json:"status" redis:"st"`
	QPM    int64  `json:"qpm"    redis:"q"`
}

func (g *Group) ToGroupCache() *GroupCache {
	return &GroupCache{
		ID:     g.ID,
		Status: g.Status,
		QPM:    g.QPM,
	}
}

func CacheDeleteGroup(id string) error {
	if !common.RedisEnabled {
		return nil
	}
	return common.RedisDel(fmt.Sprintf(GroupCacheKey, id))
}

var updateGroupQPMScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "qpm") then
		redis.call("HSet", KEYS[1], "qpm", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateGroupQPM(id string, qpm int64) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateGroupQPMScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(GroupCacheKey, id)}, qpm).Err()
}

var updateGroupStatusScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "status") then
		redis.call("HSet", KEYS[1], "status", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateGroupStatus(id string, status int) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateGroupStatusScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(GroupCacheKey, id)}, status).Err()
}

//nolint:gosec
func CacheSetGroup(group *Group) error {
	if !common.RedisEnabled {
		return nil
	}
	key := fmt.Sprintf(GroupCacheKey, group.ID)
	pipe := common.RDB.Pipeline()
	pipe.HSet(context.Background(), key, group.ToGroupCache())
	expireTime := SyncFrequency + time.Duration(rand.Int64N(60)-30)*time.Second
	pipe.Expire(context.Background(), key, expireTime)
	_, err := pipe.Exec(context.Background())
	return err
}

func CacheGetGroup(id string) (*GroupCache, error) {
	if !common.RedisEnabled {
		group, err := GetGroupByID(id)
		if err != nil {
			return nil, err
		}
		return group.ToGroupCache(), nil
	}

	cacheKey := fmt.Sprintf(GroupCacheKey, id)
	groupCache := &GroupCache{}
	err := common.RDB.HGetAll(context.Background(), cacheKey).Scan(groupCache)
	if err == nil && groupCache.Status != 0 {
		groupCache.ID = id
		return groupCache, nil
	} else if err != nil && !errors.Is(err, redis.Nil) {
		logger.SysLogf("get group (%s) from redis error: %s", id, err.Error())
	}

	group, err := GetGroupByID(id)
	if err != nil {
		return nil, err
	}

	if err := CacheSetGroup(group); err != nil {
		logger.SysError("redis set group error: " + err.Error())
	}

	return group.ToGroupCache(), nil
}

var (
	enabledModel2channels           map[string][]*Channel
	enabledModels                   []string
	enabledModelConfigs             []*ModelConfig
	channelType2EnabledModelConfigs map[int][]*ModelConfig
	channelID2channel               map[int]*Channel
	channelSyncLock                 sync.RWMutex
)

// GetEnabledModel2Channels returns a map of model name to enabled channels
func GetEnabledModel2Channels() map[string][]*Channel {
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	return enabledModel2channels
}

// CacheGetEnabledModels returns a list of enabled model names
func CacheGetEnabledModels() []string {
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	return enabledModels
}

// CacheGetChannelType2EnabledModelConfigs returns a map of channel type to enabled model configs
func CacheGetChannelType2EnabledModelConfigs() map[int][]*ModelConfig {
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	return channelType2EnabledModelConfigs
}

// CacheGetEnabledModelConfigs returns a list of enabled model configs
func CacheGetEnabledModelConfigs() []*ModelConfig {
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	return enabledModelConfigs
}

// InitChannelCache initializes the channel cache from database
func InitChannelCache() error {
	// Load enabled channels from database
	channels, err := loadEnabledChannels()
	if err != nil {
		return err
	}

	// Build channel ID to channel map
	newChannelID2channel := buildChannelIDMap(channels)

	// Build model to channels map
	newEnabledModel2channels := buildModelToChannelsMap(channels)

	// Sort channels by priority
	sortChannelsByPriority(newEnabledModel2channels)

	// Build channel type to model configs map
	newChannelType2EnabledModelConfigs := buildChannelTypeToModelConfigsMap(channels)

	// Build enabled models and configs lists
	newEnabledModels, newEnabledModelConfigs := buildEnabledModelsAndConfigs(newChannelType2EnabledModelConfigs)

	// Update global cache atomically
	updateGlobalCache(
		newEnabledModel2channels,
		newEnabledModels,
		newEnabledModelConfigs,
		newChannelID2channel,
		newChannelType2EnabledModelConfigs,
	)

	return nil
}

func loadEnabledChannels() ([]*Channel, error) {
	var channels []*Channel
	err := DB.Where("status = ?", ChannelStatusEnabled).Find(&channels).Error
	if err != nil {
		return nil, err
	}

	for _, channel := range channels {
		initializeChannelModels(channel)
		initializeChannelModelMapping(channel)
	}

	return channels, nil
}

func initializeChannelModels(channel *Channel) {
	if len(channel.Models) == 0 {
		channel.Models = config.GetDefaultChannelModels()[channel.Type]
		return
	}

	findedModels, missingModels, err := CheckModelConfig(channel.Models)
	if err != nil {
		return
	}

	sort.Strings(channel.Models)
	if len(missingModels) > 0 {
		sort.Strings(missingModels)
		logger.SysErrorf("model config not found: %v", missingModels)
	}
	channel.Models = findedModels
}

func initializeChannelModelMapping(channel *Channel) {
	if len(channel.ModelMapping) == 0 {
		channel.ModelMapping = config.GetDefaultChannelModelMapping()[channel.Type]
	}
}

func buildChannelIDMap(channels []*Channel) map[int]*Channel {
	channelMap := make(map[int]*Channel)
	for _, channel := range channels {
		channelMap[channel.ID] = channel
	}
	return channelMap
}

func buildModelToChannelsMap(channels []*Channel) map[string][]*Channel {
	modelMap := make(map[string][]*Channel)
	for _, channel := range channels {
		for _, model := range channel.Models {
			modelMap[model] = append(modelMap[model], channel)
		}
	}
	return modelMap
}

func sortChannelsByPriority(modelMap map[string][]*Channel) {
	for _, channels := range modelMap {
		sort.Slice(channels, func(i, j int) bool {
			return channels[i].Priority > channels[j].Priority
		})
	}
}

func buildChannelTypeToModelConfigsMap(channels []*Channel) map[int][]*ModelConfig {
	typeMap := make(map[int][]*ModelConfig)
	for _, channel := range channels {
		if _, ok := typeMap[channel.Type]; !ok {
			typeMap[channel.Type] = make([]*ModelConfig, 0)
		}
		configs := typeMap[channel.Type]
		for _, model := range channel.Models {
			if config, ok := CacheGetModelConfig(model); ok {
				configs = append(configs, config)
			}
		}
		slices.SortStableFunc(configs, SortModelConfigsFunc)
		typeMap[channel.Type] = configs
	}
	return typeMap
}

func buildEnabledModelsAndConfigs(typeMap map[int][]*ModelConfig) ([]string, []*ModelConfig) {
	models := make([]string, 0)
	configs := make([]*ModelConfig, 0)
	appended := make(map[string]struct{})

	for _, modelConfigs := range typeMap {
		for _, config := range modelConfigs {
			if _, ok := appended[config.Model]; ok {
				continue
			}
			models = append(models, config.Model)
			configs = append(configs, config)
			appended[config.Model] = struct{}{}
		}
	}

	slices.Sort(models)
	slices.SortStableFunc(configs, SortModelConfigsFunc)

	return models, configs
}

func SortModelConfigsFunc(i, j *ModelConfig) int {
	if i.Owner != j.Owner {
		if natural.Less(string(i.Owner), string(j.Owner)) {
			return -1
		}
		return 1
	}
	if i.Type != j.Type {
		if i.Type < j.Type {
			return -1
		}
		return 1
	}
	if i.Model == j.Model {
		return 0
	}
	if natural.Less(i.Model, j.Model) {
		return -1
	}
	return 1
}

func updateGlobalCache(
	newEnabledModel2channels map[string][]*Channel,
	newEnabledModels []string,
	newEnabledModelConfigs []*ModelConfig,
	newChannelID2channel map[int]*Channel,
	newChannelType2EnabledModelConfigs map[int][]*ModelConfig,
) {
	channelSyncLock.Lock()
	defer channelSyncLock.Unlock()
	enabledModel2channels = newEnabledModel2channels
	enabledModels = newEnabledModels
	enabledModelConfigs = newEnabledModelConfigs
	channelID2channel = newChannelID2channel
	channelType2EnabledModelConfigs = newChannelType2EnabledModelConfigs
}

func SyncChannelCache(frequency time.Duration) {
	ticker := time.NewTicker(frequency)
	defer ticker.Stop()
	for range ticker.C {
		logger.SysDebug("syncing channels from database")
		err := InitChannelCache()
		if err != nil {
			logger.SysError("failed to sync channels: " + err.Error())
			continue
		}
		logger.SysDebug("channels synced from database")
	}
}

//nolint:gosec
func CacheGetRandomSatisfiedChannel(model string) (*Channel, error) {
	channels := GetEnabledModel2Channels()[model]
	if len(channels) == 0 {
		return nil, errors.New("model not found")
	}

	if len(channels) == 1 {
		return channels[0], nil
	}

	var totalWeight int32
	for _, ch := range channels {
		totalWeight += ch.Priority
	}

	if totalWeight == 0 {
		return channels[rand.IntN(len(channels))], nil
	}

	r := rand.Int32N(totalWeight)
	for _, ch := range channels {
		r -= ch.Priority
		if r < 0 {
			return ch, nil
		}
	}

	return channels[rand.IntN(len(channels))], nil
}

func CacheGetChannelByID(id int) (*Channel, bool) {
	channelSyncLock.RLock()
	defer channelSyncLock.RUnlock()
	channel, ok := channelID2channel[id]
	return channel, ok
}

var (
	modelConfigSyncLock sync.RWMutex
	modelConfigMap      map[string]*ModelConfig
)

func InitModelConfigCache() error {
	modelConfigs, err := GetAllModelConfigs()
	if err != nil {
		return err
	}
	newModelConfigMap := make(map[string]*ModelConfig)
	for _, modelConfig := range modelConfigs {
		newModelConfigMap[modelConfig.Model] = modelConfig
	}

	modelConfigSyncLock.Lock()
	modelConfigMap = newModelConfigMap
	modelConfigSyncLock.Unlock()
	return nil
}

func SyncModelConfigCache(frequency time.Duration) {
	ticker := time.NewTicker(frequency)
	defer ticker.Stop()
	for range ticker.C {
		logger.SysDebug("syncing model configs from database")
		err := InitModelConfigCache()
		if err != nil {
			logger.SysError("failed to sync model configs: " + err.Error())
			continue
		}
		logger.SysDebug("model configs synced from database")
	}
}

func CacheGetModelConfig(model string) (*ModelConfig, bool) {
	modelConfigSyncLock.RLock()
	defer modelConfigSyncLock.RUnlock()
	modelConfig, ok := modelConfigMap[model]
	return modelConfig, ok
}

func CacheCheckModelConfig(models []string) ([]string, []string) {
	if len(models) == 0 {
		return models, nil
	}
	founded := make([]string, 0)
	missing := make([]string, 0)
	for _, model := range models {
		if _, ok := modelConfigMap[model]; ok {
			founded = append(founded, model)
		} else {
			missing = append(missing, model)
		}
	}
	return founded, missing
}
