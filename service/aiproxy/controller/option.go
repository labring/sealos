package controller

import (
	"net/http"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"

	"github.com/gin-gonic/gin"
)

func GetOptions(c *gin.Context) {
	dbOptions, err := model.GetAllOption()
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	options := make(map[string]string, len(dbOptions))
	for _, option := range dbOptions {
		options[option.Key] = option.Value
	}
	middleware.SuccessResponse(c, options)
}

func UpdateOption(c *gin.Context) {
	var option model.Option
	err := json.NewDecoder(c.Request.Body).Decode(&option)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.UpdateOption(option.Key, option.Value)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}

func UpdateOptions(c *gin.Context) {
	var options map[string]string
	err := json.NewDecoder(c.Request.Body).Decode(&options)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	err = model.UpdateOptions(options)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, nil)
}
