package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

func GetModelConfigs(c *gin.Context) {
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
	_model := c.Query("model")
	configs, total, err := model.GetModelConfigs(p*perPage, perPage, _model)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"configs": configs,
		"total":   total,
	})
}

func GetAllModelConfigs(c *gin.Context) {
	configs, err := model.GetAllModelConfigs()
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, configs)
}

type GetModelConfigsByModelsContainsRequest struct {
	Models []string `json:"models"`
}

func GetModelConfigsByModelsContains(c *gin.Context) {
	request := GetModelConfigsByModelsContainsRequest{}
	err := c.ShouldBindJSON(&request)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	configs, err := model.GetModelConfigsByModels(request.Models)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, configs)
}

func SearchModelConfigs(c *gin.Context) {
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
	_model := c.Query("model")
	owner := c.Query("owner")
	configs, total, err := model.SearchModelConfigs(keyword, p*perPage, perPage, _model, model.ModelOwner(owner))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"configs": configs,
		"total":   total,
	})
}

func SaveModelConfigs(c *gin.Context) {
	var configs []*model.ModelConfig
	if err := c.ShouldBindJSON(&configs); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err := model.SaveModelConfigs(configs)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func SaveModelConfig(c *gin.Context) {
	var config model.ModelConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err := model.SaveModelConfig(&config)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteModelConfig(c *gin.Context) {
	_model := c.Param("model")
	err := model.DeleteModelConfig(_model)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func DeleteModelConfigs(c *gin.Context) {
	models := []string{}
	err := c.ShouldBindJSON(&models)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.DeleteModelConfigsByModels(models)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func GetModelConfig(c *gin.Context) {
	_model := c.Param("model")
	config, err := model.GetModelConfig(_model)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, config)
}
