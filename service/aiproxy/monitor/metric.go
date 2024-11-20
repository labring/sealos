package monitor

import (
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/model"
)

var (
	store             = make(map[int][]bool)
	metricSuccessChan = make(chan int, config.MetricSuccessChanSize)
	metricFailChan    = make(chan int, config.MetricFailChanSize)
)

func consumeSuccess(channelID int) {
	if len(store[channelID]) > config.MetricQueueSize {
		store[channelID] = store[channelID][1:]
	}
	store[channelID] = append(store[channelID], true)
}

func consumeFail(channelID int) (bool, float64) {
	if len(store[channelID]) > config.MetricQueueSize {
		store[channelID] = store[channelID][1:]
	}
	store[channelID] = append(store[channelID], false)
	successCount := 0
	for _, success := range store[channelID] {
		if success {
			successCount++
		}
	}
	successRate := float64(successCount) / float64(len(store[channelID]))
	if len(store[channelID]) < config.MetricQueueSize {
		return false, successRate
	}
	if successRate < config.MetricSuccessRateThreshold {
		store[channelID] = make([]bool, 0)
		return true, successRate
	}
	return false, successRate
}

func metricSuccessConsumer() {
	for channelID := range metricSuccessChan {
		consumeSuccess(channelID)
	}
}

func metricFailConsumer() {
	for channelID := range metricFailChan {
		disable, _ := consumeFail(channelID)
		if disable {
			_ = model.DisableChannelByID(channelID)
		}
	}
}

func init() {
	if config.EnableMetric {
		go metricSuccessConsumer()
		go metricFailConsumer()
	}
}

func Emit(channelID int, success bool) {
	if !config.EnableMetric {
		return
	}
	go func() {
		if success {
			metricSuccessChan <- channelID
		} else {
			metricFailChan <- channelID
		}
	}()
}
