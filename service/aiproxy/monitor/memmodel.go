package monitor

import (
	"context"
	"sync"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/config"
)

var memModelMonitor *MemModelMonitor

func init() {
	memModelMonitor = NewMemModelMonitor()
}

const (
	timeWindow      = 10 * time.Second
	maxSliceCount   = 12
	banDuration     = 5 * time.Minute
	minRequestCount = 20
	cleanupInterval = time.Minute
)

type MemModelMonitor struct {
	mu     sync.RWMutex
	models map[string]*ModelData
}

type ModelData struct {
	channels   map[int64]*ChannelStats
	totalStats *TimeWindowStats
}

type ChannelStats struct {
	timeWindows *TimeWindowStats
	bannedUntil time.Time
}

type TimeWindowStats struct {
	slices []*timeSlice
	mu     sync.Mutex
}

type timeSlice struct {
	windowStart time.Time
	requests    int
	errors      int
}

func NewTimeWindowStats() *TimeWindowStats {
	return &TimeWindowStats{
		slices: make([]*timeSlice, 0, maxSliceCount),
	}
}

func NewMemModelMonitor() *MemModelMonitor {
	mm := &MemModelMonitor{
		models: make(map[string]*ModelData),
	}

	go mm.periodicCleanup()

	return mm
}

func (m *MemModelMonitor) periodicCleanup() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		m.cleanupExpiredData()
	}
}

func (m *MemModelMonitor) cleanupExpiredData() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()

	for modelName, modelData := range m.models {
		for channelID, channelStats := range modelData.channels {
			hasValidSlices := channelStats.timeWindows.HasValidSlices()
			if !hasValidSlices && !channelStats.bannedUntil.After(now) {
				delete(modelData.channels, channelID)
			}
		}

		hasValidSlices := modelData.totalStats.HasValidSlices()
		if !hasValidSlices && len(modelData.channels) == 0 {
			delete(m.models, modelName)
		}
	}
}

func (m *MemModelMonitor) AddRequest(model string, channelID int64, isError, tryBan bool) (beyondThreshold, banExecution bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()

	var modelData *ModelData
	var exists bool
	if modelData, exists = m.models[model]; !exists {
		modelData = &ModelData{
			channels:   make(map[int64]*ChannelStats),
			totalStats: NewTimeWindowStats(),
		}
		m.models[model] = modelData
	}

	var channel *ChannelStats
	if channel, exists = modelData.channels[channelID]; !exists {
		channel = &ChannelStats{
			timeWindows: NewTimeWindowStats(),
		}
		modelData.channels[channelID] = channel
	}

	modelData.totalStats.AddRequest(now, isError)
	channel.timeWindows.AddRequest(now, isError)

	return m.checkAndBan(now, channel, tryBan)
}

func (m *MemModelMonitor) checkAndBan(now time.Time, channel *ChannelStats, tryBan bool) (beyondThreshold, banExecution bool) {
	canBan := config.GetEnableModelErrorAutoBan()
	if tryBan && canBan {
		if channel.bannedUntil.After(now) {
			return false, false
		}
		channel.bannedUntil = now.Add(banDuration)
		return false, true
	}

	req, err := channel.timeWindows.GetStats(maxSliceCount)
	if req < minRequestCount {
		return false, false
	}

	if float64(err)/float64(req) >= config.GetModelErrorAutoBanRate() {
		if !canBan || channel.bannedUntil.After(now) {
			return true, false
		}
		channel.bannedUntil = now.Add(banDuration)
		return false, true
	}
	return false, false
}

func getErrorRateFromStats(stats *TimeWindowStats) float64 {
	req, err := stats.GetStats(maxSliceCount)
	if req < minRequestCount {
		return 0
	}
	return float64(err) / float64(req)
}

func (m *MemModelMonitor) GetModelsErrorRate(ctx context.Context) (map[string]float64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]float64)
	for model, data := range m.models {
		result[model] = getErrorRateFromStats(data.totalStats)
	}
	return result, nil
}

func (m *MemModelMonitor) GetModelChannelErrorRate(ctx context.Context, model string) (map[int64]float64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[int64]float64)
	if data, exists := m.models[model]; exists {
		for channelID, channel := range data.channels {
			result[channelID] = getErrorRateFromStats(channel.timeWindows)
		}
	}
	return result, nil
}

func (m *MemModelMonitor) GetChannelModelErrorRates(ctx context.Context, channelID int64) (map[string]float64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]float64)
	for model, data := range m.models {
		if channel, exists := data.channels[channelID]; exists {
			result[model] = getErrorRateFromStats(channel.timeWindows)
		}
	}
	return result, nil
}

func (m *MemModelMonitor) GetAllChannelModelErrorRates(ctx context.Context) (map[int64]map[string]float64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[int64]map[string]float64)
	for model, data := range m.models {
		for channelID, channel := range data.channels {
			if _, exists := result[channelID]; !exists {
				result[channelID] = make(map[string]float64)
			}
			result[channelID][model] = getErrorRateFromStats(channel.timeWindows)
		}
	}
	return result, nil
}

func (m *MemModelMonitor) GetBannedChannelsWithModel(ctx context.Context, model string) ([]int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var banned []int64
	if data, exists := m.models[model]; exists {
		now := time.Now()
		for channelID, channel := range data.channels {
			if channel.bannedUntil.After(now) {
				banned = append(banned, channelID)
			} else {
				channel.bannedUntil = time.Time{}
			}
		}
	}
	return banned, nil
}

func (m *MemModelMonitor) GetAllBannedModelChannels(ctx context.Context) (map[string][]int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string][]int64)
	now := time.Now()

	for model, data := range m.models {
		for channelID, channel := range data.channels {
			if channel.bannedUntil.After(now) {
				if _, exists := result[model]; !exists {
					result[model] = []int64{}
				}
				result[model] = append(result[model], channelID)
			} else {
				channel.bannedUntil = time.Time{}
			}
		}
	}
	return result, nil
}

func (m *MemModelMonitor) ClearChannelModelErrors(ctx context.Context, model string, channelID int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if data, exists := m.models[model]; exists {
		delete(data.channels, int64(channelID))
	}
	return nil
}

func (m *MemModelMonitor) ClearChannelAllModelErrors(ctx context.Context, channelID int) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, data := range m.models {
		delete(data.channels, int64(channelID))
	}
	return nil
}

func (m *MemModelMonitor) ClearAllModelErrors(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.models = make(map[string]*ModelData)
	return nil
}

func (t *TimeWindowStats) cleanupLocked(callback func(slice *timeSlice)) {
	cutoff := time.Now().Add(-timeWindow * time.Duration(maxSliceCount))
	validSlices := t.slices[:0]
	for _, s := range t.slices {
		if s.windowStart.After(cutoff) || s.windowStart.Equal(cutoff) {
			validSlices = append(validSlices, s)
			if callback != nil {
				callback(s)
			}
		}
	}
	t.slices = validSlices
}

func (t *TimeWindowStats) AddRequest(now time.Time, isError bool) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.cleanupLocked(nil)

	currentWindow := now.Truncate(timeWindow)
	var slice *timeSlice
	for i := range t.slices {
		if t.slices[i].windowStart.Equal(currentWindow) {
			slice = t.slices[i]
			break
		}
	}
	if slice == nil {
		slice = &timeSlice{windowStart: currentWindow}
		t.slices = append(t.slices, slice)
	}

	slice.requests++
	if isError {
		slice.errors++
	}
}

func (t *TimeWindowStats) GetStats(maxSlice int) (totalReq, totalErr int) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.cleanupLocked(func(slice *timeSlice) {
		totalReq += slice.requests
		totalErr += slice.errors
	})
	return
}

func (t *TimeWindowStats) HasValidSlices() bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.cleanupLocked(nil)
	return len(t.slices) > 0
}
