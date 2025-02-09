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
	"sync/atomic"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/maruel/natural"
	"github.com/redis/go-redis/v9"
	log "github.com/sirupsen/logrus"
)

const (
	SyncFrequency    = time.Minute * 3
	TokenCacheKey    = "token:%s"
	GroupCacheKey    = "group:%s"
	GroupModelTPMKey = "group:%s:model_tpm"
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

var (
	_ redis.Scanner            = (*redisTime)(nil)
	_ encoding.BinaryMarshaler = (*redisTime)(nil)
)

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
		Key:        t.Key,
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
func CacheSetToken(token *TokenCache) error {
	if !common.RedisEnabled {
		return nil
	}
	key := fmt.Sprintf(TokenCacheKey, token.Key)
	pipe := common.RDB.Pipeline()
	pipe.HSet(context.Background(), key, token)
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
		log.Errorf("get token (%s) from redis error: %s", key, err.Error())
	}

	token, err := GetTokenByKey(key)
	if err != nil {
		return nil, err
	}

	tc := token.ToTokenCache()

	if err := CacheSetToken(tc); err != nil {
		log.Error("redis set token error: " + err.Error())
	}

	return tc, nil
}

var updateTokenUsedAmountOnlyIncreaseScript = redis.NewScript(`
	local used_amount = redis.call("HGet", KEYS[1], "ua")
	if used_amount == false then
		return redis.status_reply("ok")
	end
	if ARGV[1] < used_amount then
		return redis.status_reply("ok")
	end
	redis.call("HSet", KEYS[1], "ua", ARGV[1])
	return redis.status_reply("ok")
`)

func CacheUpdateTokenUsedAmountOnlyIncrease(key string, amount float64) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateTokenUsedAmountOnlyIncreaseScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(TokenCacheKey, key)}, amount).Err()
}

var updateTokenNameScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "n") then
		redis.call("HSet", KEYS[1], "n", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateTokenName(key string, name string) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateTokenNameScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(TokenCacheKey, key)}, name).Err()
}

var updateTokenStatusScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "st") then
		redis.call("HSet", KEYS[1], "st", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateTokenStatus(key string, status int) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateTokenStatusScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(TokenCacheKey, key)}, status).Err()
}

type redisMapStringInt64 map[string]int64

var (
	_ redis.Scanner            = (*redisMapStringInt64)(nil)
	_ encoding.BinaryMarshaler = (*redisMapStringInt64)(nil)
)

func (r *redisMapStringInt64) ScanRedis(value string) error {
	return json.Unmarshal(conv.StringToBytes(value), r)
}

func (r redisMapStringInt64) MarshalBinary() ([]byte, error) {
	return json.Marshal(r)
}

type GroupCache struct {
	ID         string              `json:"-"           redis:"-"`
	Status     int                 `json:"status"      redis:"st"`
	UsedAmount float64             `json:"used_amount" redis:"ua"`
	RPMRatio   float64             `json:"rpm_ratio"   redis:"rpm_r"`
	RPM        redisMapStringInt64 `json:"rpm"         redis:"rpm"`
	TPMRatio   float64             `json:"tpm_ratio"   redis:"tpm_r"`
	TPM        redisMapStringInt64 `json:"tpm"         redis:"tpm"`
}

func (g *Group) ToGroupCache() *GroupCache {
	return &GroupCache{
		ID:         g.ID,
		Status:     g.Status,
		UsedAmount: g.UsedAmount,
		RPMRatio:   g.RPMRatio,
		RPM:        g.RPM,
		TPMRatio:   g.TPMRatio,
		TPM:        g.TPM,
	}
}

func CacheDeleteGroup(id string) error {
	if !common.RedisEnabled {
		return nil
	}
	return common.RedisDel(fmt.Sprintf(GroupCacheKey, id))
}

var updateGroupRPMRatioScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "rpm_r") then
		redis.call("HSet", KEYS[1], "rpm_r", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateGroupRPMRatio(id string, rpmRatio float64) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateGroupRPMRatioScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(GroupCacheKey, id)}, rpmRatio).Err()
}

var updateGroupRPMScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "rpm") then
		redis.call("HSet", KEYS[1], "rpm", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateGroupRPM(id string, rpm map[string]int64) error {
	if !common.RedisEnabled {
		return nil
	}
	jsonRPM, err := json.Marshal(rpm)
	if err != nil {
		return err
	}
	return updateGroupRPMScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(GroupCacheKey, id)}, conv.BytesToString(jsonRPM)).Err()
}

var updateGroupTPMRatioScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "tpm_r") then
		redis.call("HSet", KEYS[1], "tpm_r", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateGroupTPMRatio(id string, tpmRatio float64) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateGroupTPMRatioScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(GroupCacheKey, id)}, tpmRatio).Err()
}

var updateGroupTPMScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "tpm") then
		redis.call("HSet", KEYS[1], "tpm", ARGV[1])
	end
	return redis.status_reply("ok")
`)

func CacheUpdateGroupTPM(id string, tpm map[string]int64) error {
	if !common.RedisEnabled {
		return nil
	}
	jsonTPM, err := json.Marshal(tpm)
	if err != nil {
		return err
	}
	return updateGroupTPMScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(GroupCacheKey, id)}, conv.BytesToString(jsonTPM)).Err()
}

var updateGroupStatusScript = redis.NewScript(`
	if redis.call("HExists", KEYS[1], "st") then
		redis.call("HSet", KEYS[1], "st", ARGV[1])
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
func CacheSetGroup(group *GroupCache) error {
	if !common.RedisEnabled {
		return nil
	}
	key := fmt.Sprintf(GroupCacheKey, group.ID)
	pipe := common.RDB.Pipeline()
	pipe.HSet(context.Background(), key, group)
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
		log.Errorf("get group (%s) from redis error: %s", id, err.Error())
	}

	group, err := GetGroupByID(id)
	if err != nil {
		return nil, err
	}

	gc := group.ToGroupCache()

	if err := CacheSetGroup(gc); err != nil {
		log.Error("redis set group error: " + err.Error())
	}

	return gc, nil
}

var updateGroupUsedAmountOnlyIncreaseScript = redis.NewScript(`
	local used_amount = redis.call("HGet", KEYS[1], "ua")
	if used_amount == false then
		return redis.status_reply("ok")
	end
	if ARGV[1] < used_amount then
		return redis.status_reply("ok")
	end
	redis.call("HSet", KEYS[1], "ua", ARGV[1])
	return redis.status_reply("ok")
`)

func CacheUpdateGroupUsedAmountOnlyIncrease(id string, amount float64) error {
	if !common.RedisEnabled {
		return nil
	}
	return updateGroupUsedAmountOnlyIncreaseScript.Run(context.Background(), common.RDB, []string{fmt.Sprintf(GroupCacheKey, id)}, amount).Err()
}

//nolint:gosec
func CacheGetGroupModelTPM(id string, model string) (int64, error) {
	if !common.RedisEnabled {
		return GetGroupModelTPM(id, model)
	}

	cacheKey := fmt.Sprintf(GroupModelTPMKey, id)
	tpm, err := common.RDB.HGet(context.Background(), cacheKey, model).Int64()
	if err == nil {
		return tpm, nil
	} else if !errors.Is(err, redis.Nil) {
		log.Errorf("get group model tpm (%s:%s) from redis error: %s", id, model, err.Error())
	}

	tpm, err = GetGroupModelTPM(id, model)
	if err != nil {
		return 0, err
	}

	pipe := common.RDB.Pipeline()
	pipe.HSet(context.Background(), cacheKey, model, tpm)
	// 2-5 seconds
	pipe.Expire(context.Background(), cacheKey, 2*time.Second+time.Duration(rand.Int64N(3))*time.Second)
	_, err = pipe.Exec(context.Background())
	if err != nil {
		log.Errorf("set group model tpm (%s:%s) to redis error: %s", id, model, err.Error())
	}

	return tpm, nil
}

//nolint:revive
type ModelConfigCache interface {
	GetModelConfig(model string) (*ModelConfig, bool)
}

// read-only cache
//
//nolint:revive
type ModelCaches struct {
	ModelConfig                     ModelConfigCache
	EnabledModel2channels           map[string][]*Channel
	EnabledModels                   []string
	EnabledModelsMap                map[string]struct{}
	EnabledModelConfigs             []*ModelConfig
	EnabledModelConfigsMap          map[string]*ModelConfig
	EnabledChannelType2ModelConfigs map[int][]*ModelConfig
	EnabledChannelID2channel        map[int]*Channel
}

var modelCaches atomic.Pointer[ModelCaches]

func init() {
	modelCaches.Store(new(ModelCaches))
}

func LoadModelCaches() *ModelCaches {
	return modelCaches.Load()
}

// InitModelConfigAndChannelCache initializes the channel cache from database
func InitModelConfigAndChannelCache() error {
	modelConfig, err := initializeModelConfigCache()
	if err != nil {
		return err
	}

	// Load enabled newEnabledChannels from database
	newEnabledChannels, err := LoadEnabledChannels()
	if err != nil {
		return err
	}

	// Build channel ID to channel map
	newEnabledChannelID2channel := buildChannelIDMap(newEnabledChannels)

	// Build all channel ID to channel map

	// Build model to channels map
	newEnabledModel2channels := buildModelToChannelsMap(newEnabledChannels)

	// Sort channels by priority
	sortChannelsByPriority(newEnabledModel2channels)

	// Build channel type to model configs map
	newEnabledChannelType2ModelConfigs := buildChannelTypeToModelConfigsMap(newEnabledChannels, modelConfig)

	// Build enabled models and configs lists
	newEnabledModels, newEnabledModelsMap, newEnabledModelConfigs, newEnabledModelConfigsMap := buildEnabledModelsAndConfigs(newEnabledChannelType2ModelConfigs)

	// Update global cache atomically
	modelCaches.Store(&ModelCaches{
		ModelConfig:                     modelConfig,
		EnabledModel2channels:           newEnabledModel2channels,
		EnabledModels:                   newEnabledModels,
		EnabledModelsMap:                newEnabledModelsMap,
		EnabledModelConfigs:             newEnabledModelConfigs,
		EnabledModelConfigsMap:          newEnabledModelConfigsMap,
		EnabledChannelType2ModelConfigs: newEnabledChannelType2ModelConfigs,
		EnabledChannelID2channel:        newEnabledChannelID2channel,
	})

	return nil
}

func LoadEnabledChannels() ([]*Channel, error) {
	var channels []*Channel
	err := DB.Where("status = ? or status = ?", ChannelStatusEnabled, ChannelStatusFail).Find(&channels).Error
	if err != nil {
		return nil, err
	}

	for _, channel := range channels {
		initializeChannelModels(channel)
		initializeChannelModelMapping(channel)
	}

	return channels, nil
}

func LoadChannels() ([]*Channel, error) {
	var channels []*Channel
	err := DB.Find(&channels).Error
	if err != nil {
		return nil, err
	}

	for _, channel := range channels {
		initializeChannelModels(channel)
		initializeChannelModelMapping(channel)
	}

	return channels, nil
}

func LoadChannelByID(id int) (*Channel, error) {
	var channel Channel
	err := DB.First(&channel, id).Error
	if err != nil {
		return nil, err
	}

	initializeChannelModels(&channel)
	initializeChannelModelMapping(&channel)

	return &channel, nil
}

var _ ModelConfigCache = (*modelConfigMapCache)(nil)

type modelConfigMapCache struct {
	modelConfigMap map[string]*ModelConfig
}

func (m *modelConfigMapCache) GetModelConfig(model string) (*ModelConfig, bool) {
	config, ok := m.modelConfigMap[model]
	return config, ok
}

var _ ModelConfigCache = (*disabledModelConfigCache)(nil)

type disabledModelConfigCache struct {
	modelConfigs ModelConfigCache
}

func (d *disabledModelConfigCache) GetModelConfig(model string) (*ModelConfig, bool) {
	if config, ok := d.modelConfigs.GetModelConfig(model); ok {
		return config, true
	}
	return NewDefaultModelConfig(model), true
}

func initializeModelConfigCache() (ModelConfigCache, error) {
	modelConfigs, err := GetAllModelConfigs()
	if err != nil {
		return nil, err
	}
	newModelConfigMap := make(map[string]*ModelConfig)
	for _, modelConfig := range modelConfigs {
		newModelConfigMap[modelConfig.Model] = modelConfig
	}

	configs := &modelConfigMapCache{modelConfigMap: newModelConfigMap}
	if config.GetDisableModelConfig() {
		return &disabledModelConfigCache{modelConfigs: configs}, nil
	}
	return configs, nil
}

func initializeChannelModels(channel *Channel) {
	if len(channel.Models) == 0 {
		channel.Models = config.GetDefaultChannelModels()[channel.Type]
		return
	}

	findedModels, missingModels, err := GetModelConfigWithModels(channel.Models)
	if err != nil {
		return
	}

	if len(missingModels) > 0 {
		slices.Sort(missingModels)
		log.Errorf("model config not found: %v", missingModels)
	}
	slices.Sort(findedModels)
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
			return channels[i].GetPriority() > channels[j].GetPriority()
		})
	}
}

func buildChannelTypeToModelConfigsMap(channels []*Channel, modelConfigMap ModelConfigCache) map[int][]*ModelConfig {
	typeMap := make(map[int][]*ModelConfig)

	for _, channel := range channels {
		if _, ok := typeMap[channel.Type]; !ok {
			typeMap[channel.Type] = make([]*ModelConfig, 0, len(channel.Models))
		}
		configs := typeMap[channel.Type]

		for _, model := range channel.Models {
			if config, ok := modelConfigMap.GetModelConfig(model); ok {
				configs = append(configs, config)
			}
		}
		typeMap[channel.Type] = configs
	}

	for key, configs := range typeMap {
		slices.SortStableFunc(configs, SortModelConfigsFunc)
		typeMap[key] = slices.CompactFunc(configs, func(e1, e2 *ModelConfig) bool {
			return e1.Model == e2.Model
		})
	}
	return typeMap
}

func buildEnabledModelsAndConfigs(typeMap map[int][]*ModelConfig) ([]string, map[string]struct{}, []*ModelConfig, map[string]*ModelConfig) {
	models := make([]string, 0)
	configs := make([]*ModelConfig, 0)
	appended := make(map[string]struct{})
	modelConfigsMap := make(map[string]*ModelConfig)

	for _, modelConfigs := range typeMap {
		for _, config := range modelConfigs {
			if _, ok := appended[config.Model]; ok {
				continue
			}
			models = append(models, config.Model)
			configs = append(configs, config)
			appended[config.Model] = struct{}{}
			modelConfigsMap[config.Model] = config
		}
	}

	slices.Sort(models)
	slices.SortStableFunc(configs, SortModelConfigsFunc)

	return models, appended, configs, modelConfigsMap
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

func SyncModelConfigAndChannelCache(ctx context.Context, wg *sync.WaitGroup, frequency time.Duration) {
	defer wg.Done()

	ticker := time.NewTicker(frequency)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			err := InitModelConfigAndChannelCache()
			if err != nil {
				log.Error("failed to sync channels: " + err.Error())
				continue
			}
		}
	}
}

func filterChannels(channels []*Channel, ignoreChannel ...int) []*Channel {
	filtered := make([]*Channel, 0)
	for _, channel := range channels {
		if channel.Status != ChannelStatusEnabled {
			continue
		}
		if slices.Contains(ignoreChannel, channel.ID) {
			continue
		}
		filtered = append(filtered, channel)
	}
	return filtered
}

var (
	ErrChannelsNotFound  = errors.New("channels not found")
	ErrChannelsExhausted = errors.New("channels exhausted")
)

//nolint:gosec
func (c *ModelCaches) GetRandomSatisfiedChannel(model string, ignoreChannel ...int) (*Channel, error) {
	_channels := c.EnabledModel2channels[model]
	if len(_channels) == 0 {
		return nil, ErrChannelsNotFound
	}

	channels := filterChannels(_channels, ignoreChannel...)
	if len(channels) == 0 {
		return nil, ErrChannelsExhausted
	}

	if len(channels) == 1 {
		return channels[0], nil
	}

	var totalWeight int32
	for _, ch := range channels {
		totalWeight += ch.GetPriority()
	}

	if totalWeight == 0 {
		return channels[rand.IntN(len(channels))], nil
	}

	r := rand.Int32N(totalWeight)
	for _, ch := range channels {
		r -= ch.GetPriority()
		if r < 0 {
			return ch, nil
		}
	}

	return channels[rand.IntN(len(channels))], nil
}
