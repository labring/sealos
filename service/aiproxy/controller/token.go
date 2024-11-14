package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/network"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/model"
)

func GetTokens(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	p -= 1
	if p < 0 {
		p = 0
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	group := c.Query("group")
	order := c.Query("order")
	status, _ := strconv.Atoi(c.Query("status"))
	tokens, total, err := model.GetTokens(p*perPage, perPage, order, group, status)
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
		"data": gin.H{
			"tokens": tokens,
			"total":  total,
		},
	})
}

func GetGroupTokens(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	p -= 1
	if p < 0 {
		p = 0
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	group := c.Param("group")
	order := c.Query("order")
	status, _ := strconv.Atoi(c.Query("status"))
	tokens, total, err := model.GetGroupTokens(group, p*perPage, perPage, order, status)
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
		"data": gin.H{
			"tokens": tokens,
			"total":  total,
		},
	})
}

func SearchTokens(c *gin.Context) {
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	p -= 1
	if p < 0 {
		p = 0
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	order := c.Query("order")
	name := c.Query("name")
	key := c.Query("key")
	status, _ := strconv.Atoi(c.Query("status"))
	group := c.Query("group")
	tokens, total, err := model.SearchTokens(keyword, p*perPage, perPage, order, status, name, key, group)
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
		"data": gin.H{
			"tokens": tokens,
			"total":  total,
		},
	})
}

func SearchGroupTokens(c *gin.Context) {
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	p -= 1
	if p < 0 {
		p = 0
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	group := c.Param("group")
	order := c.Query("order")
	name := c.Query("name")
	key := c.Query("key")
	status, _ := strconv.Atoi(c.Query("status"))
	tokens, total, err := model.SearchGroupTokens(group, keyword, p*perPage, perPage, order, status, name, key)
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
		"data": gin.H{
			"tokens": tokens,
			"total":  total,
		},
	})
}

func GetToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	token, err := model.GetTokenById(id)
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
		"data":    token,
	})
}

func GetGroupToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	group := c.Param("group")
	token, err := model.GetGroupTokenById(group, id)
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
		"data":    token,
	})
}

func validateToken(token AddTokenRequest) error {
	if token.Name == "" {
		return fmt.Errorf("令牌名称不能为空")
	}
	if len(token.Name) > 30 {
		return fmt.Errorf("令牌名称过长")
	}
	if token.Subnet != "" {
		err := network.IsValidSubnets(token.Subnet)
		if err != nil {
			return fmt.Errorf("无效的网段：%s", err.Error())
		}
	}
	return nil
}

type AddTokenRequest struct {
	Name      string   `json:"name"`
	Subnet    string   `json:"subnet"`
	Models    []string `json:"models"`
	ExpiredAt int64    `json:"expired_at"`
	Quota     float64  `json:"quota"`
}

func AddToken(c *gin.Context) {
	group := c.Param("group")
	token := AddTokenRequest{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = validateToken(token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("参数错误：%s", err.Error()),
		})
		return
	}

	var expiredAt time.Time
	if token.ExpiredAt == 0 {
		expiredAt = time.Time{}
	} else {
		expiredAt = time.UnixMilli(token.ExpiredAt)
	}

	cleanToken := &model.Token{
		GroupId:   group,
		Name:      model.EmptyNullString(token.Name),
		Key:       random.GenerateKey(),
		ExpiredAt: expiredAt,
		Quota:     token.Quota,
		Models:    token.Models,
		Subnet:    token.Subnet,
	}
	err = model.InsertToken(cleanToken, c.Query("auto_create_group") == "true")
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
		"data":    cleanToken,
	})
}

func DeleteToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = model.DeleteTokenById(id)
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
	})
}

func DeleteGroupToken(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = model.DeleteTokenByIdAndGroupId(id, group)
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
	})
}

func UpdateToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	token := AddTokenRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = validateToken(token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("参数错误：%s", err.Error()),
		})
		return
	}
	cleanToken, err := model.GetTokenById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	expiredAt := time.Time{}
	if token.ExpiredAt != 0 {
		expiredAt = time.UnixMilli(token.ExpiredAt)
	}
	cleanToken.Name = model.EmptyNullString(token.Name)
	cleanToken.ExpiredAt = expiredAt
	cleanToken.Quota = token.Quota
	cleanToken.Models = token.Models
	cleanToken.Subnet = token.Subnet
	err = model.UpdateToken(cleanToken)
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
		"data":    cleanToken,
	})
}

func UpdateGroupToken(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	token := AddTokenRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = validateToken(token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("参数错误：%s", err.Error()),
		})
		return
	}
	cleanToken, err := model.GetGroupTokenById(group, id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	expiredAt := time.Time{}
	if token.ExpiredAt != 0 {
		expiredAt = time.UnixMilli(token.ExpiredAt)
	}
	cleanToken.Name = model.EmptyNullString(token.Name)
	cleanToken.ExpiredAt = expiredAt
	cleanToken.Quota = token.Quota
	cleanToken.Models = token.Models
	cleanToken.Subnet = token.Subnet
	err = model.UpdateToken(cleanToken)
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
		"data":    cleanToken,
	})
}

type UpdateTokenStatusRequest struct {
	Status int `json:"status"`
}

func UpdateTokenStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	token := UpdateTokenStatusRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	cleanToken, err := model.GetTokenById(id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if token.Status == model.TokenStatusEnabled {
		if cleanToken.Status == model.TokenStatusExpired && !cleanToken.ExpiredAt.IsZero() && cleanToken.ExpiredAt.Before(time.Now()) {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "令牌已过期，无法启用，请先修改令牌过期时间，或者设置为永不过期",
			})
			return
		}
		if cleanToken.Status == model.TokenStatusExhausted && cleanToken.Quota > 0 && cleanToken.UsedAmount >= cleanToken.Quota {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "令牌可用额度已用尽，无法启用，请先修改令牌剩余额度，或者设置为无限额度",
			})
			return
		}
	}
	err = model.UpdateTokenStatus(id, token.Status)
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
	})
}

type UpdateGroupTokenStatusRequest struct {
	UpdateTokenStatusRequest
}

func UpdateGroupTokenStatus(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	token := UpdateTokenStatusRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	cleanToken, err := model.GetGroupTokenById(group, id)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	if token.Status == model.TokenStatusEnabled {
		if cleanToken.Status == model.TokenStatusExpired && !cleanToken.ExpiredAt.IsZero() && cleanToken.ExpiredAt.Before(time.Now()) {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "令牌已过期，无法启用，请先修改令牌过期时间，或者设置为永不过期",
			})
			return
		}
		if cleanToken.Status == model.TokenStatusExhausted && cleanToken.Quota > 0 && cleanToken.UsedAmount >= cleanToken.Quota {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "令牌可用额度已用尽，无法启用，请先修改令牌剩余额度，或者设置为无限额度",
			})
			return
		}
	}
	err = model.UpdateGroupTokenStatus(group, id, token.Status)
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
	})
}

type UpdateTokenNameRequest struct {
	Name string `json:"name"`
}

func UpdateTokenName(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
	}
	name := UpdateTokenNameRequest{}
	err = c.ShouldBindJSON(&name)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
	}
	err = model.UpdateTokenName(id, name.Name)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateGroupTokenName(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
	}
	name := UpdateTokenNameRequest{}
	err = c.ShouldBindJSON(&name)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
	}
	err = model.UpdateGroupTokenName(group, id, name.Name)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
