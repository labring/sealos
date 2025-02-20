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

// TokenResponse represents the response structure for token endpoints
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

type (
	AddTokenRequest struct {
		Name      string   `json:"name"`
		Subnet    string   `json:"subnet"`
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

func validateToken(token AddTokenRequest) error {
	if token.Name == "" {
		return errors.New("token name cannot be empty")
	}
	if len(token.Name) > 30 {
		return errors.New("token name is too long")
	}
	if token.Subnet != "" {
		if err := network.IsValidSubnets(token.Subnet); err != nil {
			return fmt.Errorf("invalid subnet: %w", err)
		}
	}
	return nil
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

	tokens, total, err := model.GetTokens(group, page*perPage, perPage, order, status)
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

	tokens, total, err := model.GetTokens(group, page*perPage, perPage, order, status)
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

	tokens, total, err := model.SearchTokens(group, keyword, page*perPage, perPage, order, status, name, key)
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

	tokens, total, err := model.SearchTokens(group, keyword, page*perPage, perPage, order, status, name, key)
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

func AddToken(c *gin.Context) {
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

	var expiredAt time.Time
	if req.ExpiredAt > 0 {
		expiredAt = time.UnixMilli(req.ExpiredAt)
	}

	token := &model.Token{
		GroupID:   group,
		Name:      model.EmptyNullString(req.Name),
		Key:       random.GenerateKey(),
		ExpiredAt: expiredAt,
		Quota:     req.Quota,
		Models:    req.Models,
		Subnet:    req.Subnet,
	}

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

	if err := validateToken(req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}

	token, err := model.GetTokenByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	var expiredAt time.Time
	if req.ExpiredAt > 0 {
		expiredAt = time.UnixMilli(req.ExpiredAt)
	}

	token.Name = model.EmptyNullString(req.Name)
	token.ExpiredAt = expiredAt
	token.Quota = req.Quota
	token.Models = req.Models
	token.Subnet = req.Subnet

	if err := model.UpdateToken(token); err != nil {
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

	if err := validateToken(req); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "parameter error: "+err.Error())
		return
	}

	token, err := model.GetGroupTokenByID(group, id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	var expiredAt time.Time
	if req.ExpiredAt > 0 {
		expiredAt = time.UnixMilli(req.ExpiredAt)
	}

	token.Name = model.EmptyNullString(req.Name)
	token.ExpiredAt = expiredAt
	token.Quota = req.Quota
	token.Models = req.Models
	token.Subnet = req.Subnet

	if err := model.UpdateToken(token); err != nil {
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

	token, err := model.GetTokenByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if req.Status == model.TokenStatusEnabled {
		if err := validateTokenStatus(token); err != nil {
			middleware.ErrorResponse(c, http.StatusOK, err.Error())
			return
		}
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

	token, err := model.GetGroupTokenByID(group, id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}

	if req.Status == model.TokenStatusEnabled {
		if err := validateTokenStatus(token); err != nil {
			middleware.ErrorResponse(c, http.StatusOK, err.Error())
			return
		}
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
