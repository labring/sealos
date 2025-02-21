package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

type GroupResponse struct {
	*model.Group
	AccessedAt time.Time `json:"accessed_at,omitempty"`
}

func (g *GroupResponse) MarshalJSON() ([]byte, error) {
	type Alias model.Group
	return json.Marshal(&struct {
		*Alias
		CreatedAt  int64 `json:"created_at,omitempty"`
		AccessedAt int64 `json:"accessed_at,omitempty"`
	}{
		Alias:      (*Alias)(g.Group),
		CreatedAt:  g.CreatedAt.UnixMilli(),
		AccessedAt: g.AccessedAt.UnixMilli(),
	})
}

func GetGroups(c *gin.Context) {
	page, perPage := parsePageParams(c)
	order := c.DefaultQuery("order", "")
	groups, total, err := model.GetGroups(page*perPage, perPage, order, false)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	groupResponses := make([]*GroupResponse, len(groups))
	for i, group := range groups {
		lastRequestAt, _ := model.GetGroupLastRequestTime(group.ID)
		groupResponses[i] = &GroupResponse{
			Group:      group,
			AccessedAt: lastRequestAt,
		}
	}
	middleware.SuccessResponse(c, gin.H{
		"groups": groupResponses,
		"total":  total,
	})
}

func SearchGroups(c *gin.Context) {
	keyword := c.Query("keyword")
	page, perPage := parsePageParams(c)
	order := c.DefaultQuery("order", "")
	status, _ := strconv.Atoi(c.Query("status"))
	groups, total, err := model.SearchGroup(keyword, page*perPage, perPage, order, status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	groupResponses := make([]*GroupResponse, len(groups))
	for i, group := range groups {
		lastRequestAt, _ := model.GetGroupLastRequestTime(group.ID)
		groupResponses[i] = &GroupResponse{
			Group:      group,
			AccessedAt: lastRequestAt,
		}
	}
	middleware.SuccessResponse(c, gin.H{
		"groups": groupResponses,
		"total":  total,
	})
}

func GetGroup(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group id is empty")
		return
	}
	_group, err := model.GetGroupByID(group)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	lastRequestAt, _ := model.GetGroupLastRequestTime(group)
	groupResponse := &GroupResponse{
		Group:      _group,
		AccessedAt: lastRequestAt,
	}
	middleware.SuccessResponse(c, groupResponse)
}

type UpdateGroupRPMRatioRequest struct {
	RPMRatio float64 `json:"rpm_ratio"`
}

func UpdateGroupRPMRatio(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := UpdateGroupRPMRatioRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err = model.UpdateGroupRPMRatio(group, req.RPMRatio)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

type UpdateGroupRPMRequest struct {
	RPM map[string]int64 `json:"rpm"`
}

func UpdateGroupRPM(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := UpdateGroupRPMRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err = model.UpdateGroupRPM(group, req.RPM)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

type UpdateGroupTPMRequest struct {
	TPM map[string]int64 `json:"tpm"`
}

func UpdateGroupTPM(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := UpdateGroupTPMRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err = model.UpdateGroupTPM(group, req.TPM)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

type UpdateGroupTPMRatioRequest struct {
	TPMRatio float64 `json:"tpm_ratio"`
}

func UpdateGroupTPMRatio(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := UpdateGroupTPMRatioRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err = model.UpdateGroupTPMRatio(group, req.TPMRatio)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

type UpdateGroupStatusRequest struct {
	Status int `json:"status"`
}

func UpdateGroupStatus(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := UpdateGroupStatusRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err = model.UpdateGroupStatus(group, req.Status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteGroup(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err := model.DeleteGroupByID(group)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteGroups(c *gin.Context) {
	ids := []string{}
	err := c.ShouldBindJSON(&ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.DeleteGroupsByIDs(ids)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

type CreateGroupRequest struct {
	RPM      map[string]int64 `json:"rpm"`
	RPMRatio float64          `json:"rpm_ratio"`
	TPM      map[string]int64 `json:"tpm"`
	TPMRatio float64          `json:"tpm_ratio"`
}

func CreateGroup(c *gin.Context) {
	group := c.Param("group")
	if group == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := CreateGroupRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	if err := model.CreateGroup(&model.Group{
		ID:       group,
		RPMRatio: req.RPMRatio,
		RPM:      req.RPM,
		TPMRatio: req.TPMRatio,
		TPM:      req.TPM,
	}); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}
