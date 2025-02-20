package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
)

func GetModelConfigs(c *gin.Context) {
	page, perPage := parsePageParams(c)
	_model := c.Query("model")
	configs, total, err := model.GetModelConfigs(page*perPage, perPage, _model)
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
	page, perPage := parsePageParams(c)
	_model := c.Query("model")
	owner := c.Query("owner")
	configs, total, err := model.SearchModelConfigs(keyword, page*perPage, perPage, _model, model.ModelOwner(owner))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, gin.H{
		"configs": configs,
		"total":   total,
	})
}

type SaveModelConfigsRequest struct {
	CreatedAt int64 `json:"created_at"`
	UpdatedAt int64 `json:"updated_at"`
	*model.ModelConfig
}

func SaveModelConfigs(c *gin.Context) {
	var configs []*SaveModelConfigsRequest
	if err := c.ShouldBindJSON(&configs); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	modelConfigs := make([]*model.ModelConfig, len(configs))
	for i, config := range configs {
		modelConfigs[i] = config.ModelConfig
	}
	err := model.SaveModelConfigs(modelConfigs)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func SaveModelConfig(c *gin.Context) {
	var config SaveModelConfigsRequest
	if err := c.ShouldBindJSON(&config); err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err := model.SaveModelConfig(config.ModelConfig)
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
