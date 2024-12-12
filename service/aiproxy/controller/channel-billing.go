package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	log "github.com/sirupsen/logrus"

	"github.com/gin-gonic/gin"
)

// https://github.com/labring/sealos/service/aiproxy/issues/79

func updateChannelBalance(channel *model.Channel) (float64, error) {
	adaptorI, ok := channeltype.GetAdaptor(channel.Type)
	if !ok {
		return 0, fmt.Errorf("invalid channel type: %d", channel.Type)
	}
	if getBalance, ok := adaptorI.(adaptor.GetBalance); ok {
		balance, err := getBalance.GetBalance(channel)
		if err != nil {
			return 0, err
		}
		err = channel.UpdateBalance(balance)
		if err != nil {
			log.Errorf("failed to update channel %s(%d) balance: %s", channel.Name, channel.ID, err.Error())
		}
		return balance, nil
	}
	return 0, fmt.Errorf("channel type %d does not support get balance", channel.Type)
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
	channel, err := model.GetChannelByID(id, false)
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}
	balance, err := updateChannelBalance(channel)
	if err != nil {
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
	channels, err := model.GetAllChannels(false, false)
	if err != nil {
		return err
	}
	for _, channel := range channels {
		_, err := updateChannelBalance(channel)
		if err != nil {
			continue
		}
	}
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

func AutomaticallyUpdateChannels(frequency int) {
	for {
		time.Sleep(time.Duration(frequency) * time.Minute)
		log.Info("updating all channels")
		_ = updateAllChannelsBalance()
		log.Info("channels update done")
	}
}

// subscription
func GetSubscription(c *gin.Context) {
	group := c.MustGet(ctxkey.Group).(*model.GroupCache)
	b, _, err := balance.Default.GetGroupRemainBalance(c, group.ID)
	if err != nil {
		log.Errorf("get group (%s) balance failed: %s", group.ID, err)
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: fmt.Sprintf("get group (%s) balance failed", group.ID),
		})
		return
	}
	token := c.MustGet(ctxkey.Token).(*model.TokenCache)
	quota := token.Quota
	if quota <= 0 {
		quota = b
	}
	c.JSON(http.StatusOK, openai.SubscriptionResponse{
		HardLimitUSD:       quota / 7,
		SoftLimitUSD:       b / 7,
		SystemHardLimitUSD: quota / 7,
	})
}

func GetUsage(c *gin.Context) {
	token := c.MustGet(ctxkey.Token).(*model.TokenCache)
	c.JSON(http.StatusOK, openai.UsageResponse{TotalUsage: token.UsedAmount / 7 * 100})
}
