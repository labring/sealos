package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/bytedance/sonic"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/network"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

// TokenResponse represents the response structure for token endpoints
type TokenResponse struct {
	*model.Token
	AccessedAt time.Time `json:"accessed_at"`
}

func (t *TokenResponse) MarshalJSON() ([]byte, error) {
	type Alias TokenResponse
	return sonic.Marshal(&struct {
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

type (
	AddTokenRequest struct {
		Name      string   `json:"name"`
		Subnets   []string `json:"subnets"`
		Models    []string `json:"models"`
		ExpiredAt int64    `json:"expiredAt"`
		Quota     float64  `json:"quota"`
	}

	UpdateTokenStatusRequest struct {
		Status int `json:"status"`
	}

	UpdateTokenNameRequest struct {
		Name string `json:"name"`
	}
)

func (at *AddTokenRequest) ToToken() *model.Token {
	var expiredAt time.Time
	if at.ExpiredAt > 0 {
		expiredAt = time.UnixMilli(at.ExpiredAt)
	}
	return &model.Token{
		Name:      model.EmptyNullString(at.Name),
		Subnets:   at.Subnets,
		Models:    at.Models,
		ExpiredAt: expiredAt,
		Quota:     at.Quota,
	}
}

func validateToken(token AddTokenRequest) error {
	if token.Name == "" {
		return errors.New("token name cannot be empty")
	}
	if len(token.Name) > 30 {
		return errors.New("token name is too long")
	}
	if err := network.IsValidSubnets(token.Subnets); err != nil {
		return fmt.Errorf("invalid subnet: %w", err)
	}
	return nil
}

func validateTokenUpdate(token AddTokenRequest) error {
	if err := network.IsValidSubnets(token.Subnets); err != nil {
		return fmt.Errorf("invalid subnet: %w", err)
	}
	return nil
}

func buildTokenResponse(token *model.Token) *TokenResponse {
	lastRequestAt, _ := model.GetTokenLastRequestTime(token.ID)
	return &TokenResponse{
		Token:      token,
		AccessedAt: lastRequestAt,
	}
}

func buildTokenResponses(tokens []*model.Token) []*TokenResponse {
	responses := make([]*TokenResponse, len(tokens))
	for i, token := range tokens {
		responses[i] = buildTokenResponse(token)
	}
	return responses
}

// Token list handlers
func GetTokens(c *gin.Context) {
	page, perPage := parsePageParams(c)
	group := c.Query("group")
	order := c.Query("order")
	status, _ := strconv.Atoi(c.Query("status"))

	tokens, total, err := model.GetTokens(group, page, perPage, order, status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, gin.H{
		"tokens": buildTokenResponses(tokens),
		"total":  total,
	})
}

func GetGroupTokens(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}

	page, perPage := parsePageParams(c)
	order := c.Query("order")
	status, _ := strconv.Atoi(c.Query("status"))

	tokens, total, err := model.GetTokens(group, page, perPage, order, status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, gin.H{
		"tokens": buildTokenResponses(tokens),
		"total":  total,
	})
}

func SearchTokens(c *gin.Context) {
	page, perPage := parsePageParams(c)
	keyword := c.Query("keyword")
	order := c.Query("order")
	name := c.Query("name")
	key := c.Query("key")
	status, _ := strconv.Atoi(c.Query("status"))
	group := c.Query("group")

	tokens, total, err := model.SearchTokens(group, keyword, page, perPage, order, status, name, key)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, gin.H{
		"tokens": buildTokenResponses(tokens),
		"total":  total,
	})
}

func SearchGroupTokens(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group is required")
		return
	}

	page, perPage := parsePageParams(c)
	keyword := c.Query("keyword")
	order := c.Query("order")
	name := c.Query("name")
	key := c.Query("key")
	status, _ := strconv.Atoi(c.Query("status"))

	tokens, total, err := model.SearchTokens(group, keyword, page, perPage, order, status, name, key)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, gin.H{
		"tokens": buildTokenResponses(tokens),
		"total":  total,
	})
}

// Single token handlers
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

	middleware.SuccessResponse(c, buildTokenResponse(token))
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

	middleware.SuccessResponse(c, buildTokenResponse(token))
}

func AddGroupToken(c *gin.Context) {
	group := c.Param("group")
	var req AddTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := validateToken(req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}

	token := req.ToToken()
	token.GroupID = group
	token.Key = random.GenerateKey()

	if err := model.InsertToken(token, c.Query("auto_create_group") == "true"); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, &TokenResponse{Token: token})
}

// Delete handlers
func DeleteToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := model.DeleteTokenByID(id); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, nil)
}

func DeleteTokens(c *gin.Context) {
	var ids []int
	if err := c.ShouldBindJSON(&ids); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := model.DeleteTokensByIDs(ids); err != nil {
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

	if err := model.DeleteGroupTokenByID(group, id); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, nil)
}

func DeleteGroupTokens(c *gin.Context) {
	group := c.Param("group")
	var ids []int
	if err := c.ShouldBindJSON(&ids); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := model.DeleteGroupTokensByIDs(group, ids); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, nil)
}

// Update handlers
func UpdateToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	var req AddTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := validateTokenUpdate(req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}

	token := req.ToToken()

	if err := model.UpdateToken(id, token); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, &TokenResponse{Token: token})
}

func UpdateGroupToken(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	var req AddTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := validateTokenUpdate(req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}

	token := req.ToToken()

	if err := model.UpdateGroupToken(id, group, token); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, &TokenResponse{Token: token})
}

func UpdateTokenStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	var req UpdateTokenStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := model.UpdateTokenStatus(id, req.Status); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, nil)
}

func UpdateGroupTokenStatus(c *gin.Context) {
	group := c.Param("group")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	var req UpdateTokenStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := model.UpdateGroupTokenStatus(group, id, req.Status); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, nil)
}

func UpdateTokenName(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	var req UpdateTokenNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := model.UpdateTokenName(id, req.Name); err != nil {
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

	var req UpdateTokenNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if err := model.UpdateGroupTokenName(group, id, req.Name); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	middleware.SuccessResponse(c, nil)
}
