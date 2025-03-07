package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/notify"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	log "github.com/sirupsen/logrus"
)

// https://github.com/labring/sealos/service/aiproxy/issues/79

func updateChannelBalance(channel *model.Channel) (float64, error) {
	adaptorI, ok := channeltype.GetAdaptor(channel.Type)
	if !ok {
		return 0, fmt.Errorf("invalid channel type: %d, channel: %s(%d)", channel.Type, channel.Name, channel.ID)
	}
	if getBalance, ok := adaptorI.(adaptor.Balancer); ok {
		balance, err := getBalance.GetBalance(channel)
		if err != nil && !errors.Is(err, adaptor.ErrGetBalanceNotImplemented) {
			return 0, fmt.Errorf("failed to get channel[%d] %s(%d) balance: %s", channel.Type, channel.Name, channel.ID, err.Error())
		}
		if err := channel.UpdateBalance(balance); err != nil {
			return 0, fmt.Errorf("failed to update channel [%d] %s(%d) balance: %s", channel.Type, channel.Name, channel.ID, err.Error())
		}
		if !errors.Is(err, adaptor.ErrGetBalanceNotImplemented) &&
			balance < channel.GetBalanceThreshold() {
			return 0, fmt.Errorf("channel[%d] %s(%d) balance is less than threshold: %f", channel.Type, channel.Name, channel.ID, balance)
		}
		return balance, nil
	}
	return 0, nil
}

func UpdateChannelBalance(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}
	channel, err := model.GetChannelByID(id)
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}
	balance, err := updateChannelBalance(channel)
	if err != nil {
		notify.Error(fmt.Sprintf("check channel[%d] %s(%d) balance error", channel.Type, channel.Name, channel.ID), err.Error())
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, middleware.APIResponse{
		Success: true,
		Message: "",
		Data:    balance,
	})
}

func updateAllChannelsBalance() error {
	channels, err := model.GetAllChannels()
	if err != nil {
		return err
	}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 10)

	for _, channel := range channels {
		if !channel.EnabledAutoBalanceCheck {
			continue
		}
		wg.Add(1)
		semaphore <- struct{}{}
		go func(ch *model.Channel) {
			defer wg.Done()
			defer func() { <-semaphore }()
			_, err := updateChannelBalance(ch)
			if err != nil {
				notify.Error(fmt.Sprintf("check channel[%d] %s(%d) balance error", ch.Type, ch.Name, ch.ID), err.Error())
			}
		}(channel)
	}

	wg.Wait()
	return nil
}

func UpdateAllChannelsBalance(c *gin.Context) {
	err := updateAllChannelsBalance()
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func UpdateChannelsBalance(frequency time.Duration) {
	for {
		time.Sleep(frequency)
		_ = updateAllChannelsBalance()
	}
}

// subscription
func GetSubscription(c *gin.Context) {
	group := middleware.GetGroup(c)
	b, _, err := balance.GetGroupRemainBalance(c, *group)
	if err != nil {
		if errors.Is(err, balance.ErrNoRealNameUsedAmountLimit) {
			middleware.ErrorResponse(c, http.StatusForbidden, err.Error())
			return
		}
		log.Errorf("get group (%s) balance failed: %s", group.ID, err)
		middleware.ErrorResponse(c, http.StatusInternalServerError, fmt.Sprintf("get group (%s) balance failed", group.ID))
		return
	}
	token := middleware.GetToken(c)
	quota := token.Quota
	if quota <= 0 {
		quota = b
	}
	c.JSON(http.StatusOK, openai.SubscriptionResponse{
		HardLimitUSD:       quota + token.UsedAmount,
		SoftLimitUSD:       b,
		SystemHardLimitUSD: quota + token.UsedAmount,
	})
}

func GetUsage(c *gin.Context) {
	token := middleware.GetToken(c)
	c.JSON(http.StatusOK, openai.UsageResponse{TotalUsage: token.UsedAmount * 100})
}
