package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/network"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

type TokenResponse struct {
	*model.Token
	AccessedAt time.Time `json:"accessed_at"`
}

func (t *TokenResponse) MarshalJSON() ([]byte, error) {
	type Alias TokenResponse
	return json.Marshal(&struct {
		*Alias
		CreatedAt  int64 `json:"created_at"`
		ExpiredAt  int64 `json:"expired_at"`
		AccessedAt int64 `json:"accessed_at"`
	}{
		Alias:      (*Alias)(t),
		CreatedAt:  t.CreatedAt.UnixMilli(),
		ExpiredAt:  t.ExpiredAt.UnixMilli(),
		AccessedAt: t.AccessedAt.UnixMilli(),
	})
}

func GetTokens(c *gin.Context) {
	p, _ := strconv.Atoi(c.Query("p"))
	p--
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
	tokens, total, err := model.GetTokens(group, p*perPage, perPage, order, status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	tokenResponses := make([]*TokenResponse, len(tokens))
	for i, token := range tokens {
		lastRequestAt, _ := model.GetTokenLastRequestTime(token.ID)
		tokenResponses[i] = &TokenResponse{
			Token:      token,
			AccessedAt: lastRequestAt,
		}
	}
	middleware.SuccessResponse(c, gin.H{
		"tokens": tokenResponses,
		"total":  total,
	})
}

func GetGroupTokens(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}
	p, _ := strconv.Atoi(c.Query("p"))
	p--
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
	status, _ := strconv.Atoi(c.Query("status"))
	tokens, total, err := model.GetTokens(group, p*perPage, perPage, order, status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	tokenResponses := make([]*TokenResponse, len(tokens))
	for i, token := range tokens {
		lastRequestAt, _ := model.GetTokenLastRequestTime(token.ID)
		tokenResponses[i] = &TokenResponse{
			Token:      token,
			AccessedAt: lastRequestAt,
		}
	}
	middleware.SuccessResponse(c, gin.H{
		"tokens": tokenResponses,
		"total":  total,
	})
}

func SearchTokens(c *gin.Context) {
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	p--
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
	tokens, total, err := model.SearchTokens(group, keyword, p*perPage, perPage, order, status, name, key)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	tokenResponses := make([]*TokenResponse, len(tokens))
	for i, token := range tokens {
		lastRequestAt, _ := model.GetTokenLastRequestTime(token.ID)
		tokenResponses[i] = &TokenResponse{
			Token:      token,
			AccessedAt: lastRequestAt,
		}
	}
	middleware.SuccessResponse(c, gin.H{
		"tokens": tokenResponses,
		"total":  total,
	})
}

func SearchGroupTokens(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}
	keyword := c.Query("keyword")
	p, _ := strconv.Atoi(c.Query("p"))
	p--
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
	tokens, total, err := model.SearchTokens(group, keyword, p*perPage, perPage, order, status, name, key)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	tokenResponses := make([]*TokenResponse, len(tokens))
	for i, token := range tokens {
		lastRequestAt, _ := model.GetTokenLastRequestTime(token.ID)
		tokenResponses[i] = &TokenResponse{
			Token:      token,
			AccessedAt: lastRequestAt,
		}
	}
	middleware.SuccessResponse(c, gin.H{
		"tokens": tokenResponses,
		"total":  total,
	})
}

func GetToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	token, err := model.GetTokenByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	lastRequestAt, _ := model.GetTokenLastRequestTime(id)
	tokenResponse := &TokenResponse{
		Token:      token,
		AccessedAt: lastRequestAt,
	}
	middleware.SuccessResponse(c, tokenResponse)
}

func GetGroupToken(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	token, err := model.GetGroupTokenByID(group, id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	lastRequestAt, _ := model.GetTokenLastRequestTime(id)
	tokenResponse := &TokenResponse{
		Token:      token,
		AccessedAt: lastRequestAt,
	}
	middleware.SuccessResponse(c, tokenResponse)
}

func validateToken(token AddTokenRequest) error {
	if token.Name == "" {
		return errors.New("token name cannot be empty")
	}
	if len(token.Name) > 30 {
		return errors.New("token name is too long")
	}
	if token.Subnet != "" {
		err := network.IsValidSubnets(token.Subnet)
		if err != nil {
			return fmt.Errorf("invalid subnet: %w", err)
		}
	}
	return nil
}

type AddTokenRequest struct {
	Name      string   `json:"name"`
	Subnet    string   `json:"subnet"`
	Models    []string `json:"models"`
	ExpiredAt int64    `json:"expiredAt"`
	Quota     float64  `json:"quota"`
}

func AddToken(c *gin.Context) {
	group := c.Param("group")
	token := AddTokenRequest{}
	err := c.ShouldBindJSON(&token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = validateToken(token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}

	var expiredAt time.Time
	if token.ExpiredAt == 0 {
		expiredAt = time.Time{}
	} else {
		expiredAt = time.UnixMilli(token.ExpiredAt)
	}

	cleanToken := &model.Token{
		GroupID:   group,
		Name:      model.EmptyNullString(token.Name),
		Key:       random.GenerateKey(),
		ExpiredAt: expiredAt,
		Quota:     token.Quota,
		Models:    token.Models,
		Subnet:    token.Subnet,
	}
	err = model.InsertToken(cleanToken, c.Query("auto_create_group") == "true")
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, &TokenResponse{
		Token: cleanToken,
	})
}

func DeleteToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.DeleteTokenByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteTokens(c *gin.Context) {
	ids := []int{}
	err := c.ShouldBindJSON(&ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.DeleteTokensByIDs(ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteGroupToken(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.DeleteGroupTokenByID(group, id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteGroupTokens(c *gin.Context) {
	group := c.Param("group")
	ids := []int{}
	err := c.ShouldBindJSON(&ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.DeleteGroupTokensByIDs(group, ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func UpdateToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	token := AddTokenRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = validateToken(token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}
	cleanToken, err := model.GetTokenByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
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
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, &TokenResponse{
		Token: cleanToken,
	})
}

func UpdateGroupToken(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	token := AddTokenRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = validateToken(token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}
	cleanToken, err := model.GetGroupTokenByID(group, id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
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
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, &TokenResponse{
		Token: cleanToken,
	})
}

type UpdateTokenStatusRequest struct {
	Status int `json:"status"`
}

func UpdateTokenStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	token := UpdateTokenStatusRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	cleanToken, err := model.GetTokenByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if token.Status == model.TokenStatusEnabled {
		if err := validateTokenStatus(cleanToken); err != nil {
			middleware.ErrorResponse(c, http.StatusOK, err.Error())
			return
		}
	}

	err = model.UpdateTokenStatus(id, token.Status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

type UpdateGroupTokenStatusRequest struct {
	UpdateTokenStatusRequest
}

func UpdateGroupTokenStatus(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	token := UpdateTokenStatusRequest{}
	err = c.ShouldBindJSON(&token)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	cleanToken, err := model.GetGroupTokenByID(group, id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if token.Status == model.TokenStatusEnabled {
		if err := validateTokenStatus(cleanToken); err != nil {
			middleware.ErrorResponse(c, http.StatusOK, err.Error())
			return
		}
	}

	err = model.UpdateGroupTokenStatus(group, id, token.Status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func validateTokenStatus(token *model.Token) error {
	if token.Status == model.TokenStatusExpired && !token.ExpiredAt.IsZero() && token.ExpiredAt.Before(time.Now()) {
		return errors.New("token expired, please update token expired time or set to never expire")
	}
	if token.Status == model.TokenStatusExhausted && token.Quota > 0 && token.UsedAmount >= token.Quota {
		return errors.New("token quota exhausted, please update token quota or set to unlimited quota")
	}
	return nil
}

type UpdateTokenNameRequest struct {
	Name string `json:"name"`
}

func UpdateTokenName(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	name := UpdateTokenNameRequest{}
	err = c.ShouldBindJSON(&name)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.UpdateTokenName(id, name.Name)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func UpdateGroupTokenName(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	name := UpdateTokenNameRequest{}
	err = c.ShouldBindJSON(&name)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.UpdateGroupTokenName(group, id, name.Name)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}
