package controller

import (
	"net/http"
	"strconv"
	"time"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"

	"github.com/gin-gonic/gin"
)

func GetGroups(c *gin.Context) {
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

	order := c.DefaultQuery("order", "")
	groups, total, err := model.GetGroups(p*perPage, perPage, order, false)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"groups": groups,
		"total":  total,
	})
}

func SearchGroups(c *gin.Context) {
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
	order := c.DefaultQuery("order", "")
	status, _ := strconv.Atoi(c.Query("status"))
	groups, total, err := model.SearchGroup(keyword, p*perPage, perPage, order, status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"groups": groups,
		"total":  total,
	})
}

func GetGroup(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		middleware.ErrorResponse(c, http.StatusOK, "group id is empty")
		return
	}
	group, err := model.GetGroupByID(id)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, group)
}

func GetGroupDashboard(c *gin.Context) {
	id := c.Param("id")
	now := time.Now()
	startOfDay := now.Truncate(24*time.Hour).AddDate(0, 0, -6).Unix()
	endOfDay := now.Truncate(24 * time.Hour).Add(24*time.Hour - time.Second).Unix()

	dashboards, err := model.SearchLogsByDayAndModel(id, time.Unix(startOfDay, 0), time.Unix(endOfDay, 0))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "failed to get statistics")
		return
	}
	middleware.SuccessResponse(c, dashboards)
}

type UpdateGroupQPMRequest struct {
	QPM int64 `json:"qpm"`
}

func UpdateGroupQPM(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := UpdateGroupQPMRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err = model.UpdateGroupQPM(id, req.QPM)
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
	id := c.Param("id")
	if id == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	req := UpdateGroupStatusRequest{}
	err := json.NewDecoder(c.Request.Body).Decode(&req)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err = model.UpdateGroupStatus(id, req.Status)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteGroup(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	err := model.DeleteGroupByID(id)
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
	ID  string `json:"id"`
	QPM int64  `json:"qpm"`
}

func CreateGroup(c *gin.Context) {
	var group CreateGroupRequest
	err := json.NewDecoder(c.Request.Body).Decode(&group)
	if err != nil || group.ID == "" {
		middleware.ErrorResponse(c, http.StatusOK, "invalid parameter")
		return
	}
	if err := model.CreateGroup(&model.Group{
		ID:  group.ID,
		QPM: group.QPM,
	}); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}
