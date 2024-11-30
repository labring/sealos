package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"

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
		channel.UpdateBalance(balance)
		return balance, nil
	}
	return 0, fmt.Errorf("channel type %d does not support get balance", channel.Type)
}

func UpdateChannelBalance(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	channel, err := model.GetChannelByID(id, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	balance, err := updateChannelBalance(channel)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"balance": balance,
	})
}

func updateAllChannelsBalance() error {
	channels, err := model.GetAllChannels(false, false)
	if err != nil {
		return err
	}
	for _, channel := range channels {
		if channel.Status != model.ChannelStatusEnabled {
			continue
		}
		balance, err := updateChannelBalance(channel)
		if err != nil {
			continue
		}
		// err is nil & balance <= 0 means quota is used up
		if balance <= 0 {
			_ = model.DisableChannelByID(channel.ID)
		}
		time.Sleep(time.Second)
	}
	return nil
}

func UpdateAllChannelsBalance(c *gin.Context) {
	// err := updateAllChannelsBalance()
	// if err != nil {
	// 	c.JSON(http.StatusOK, gin.H{
	// 		"success": false,
	// 		"message": err.Error(),
	// 	})
	// 	return
	// }
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func AutomaticallyUpdateChannels(frequency int) {
	for {
		time.Sleep(time.Duration(frequency) * time.Minute)
		logger.SysLog("updating all channels")
		_ = updateAllChannelsBalance()
		logger.SysLog("channels update done")
	}
}

// subscription
func GetSubscription(c *gin.Context) {
	group := c.GetString(ctxkey.Group)
	b, _, err := balance.Default.GetGroupRemainBalance(c, group)
	if err != nil {
		logger.Errorf(c, "get group (%s) balance failed: %s", group, err)
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("get group (%s) balance failed", group),
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
