package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
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

func GetOption(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		middleware.ErrorResponse(c, http.StatusOK, "key is required")
		return
	}
	option, err := model.GetOption(key)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusOK, err.Error())
		return
	}
	middleware.SuccessResponse(c, option)
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
