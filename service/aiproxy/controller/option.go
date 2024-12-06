package controller

import (
	"net/http"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/model"

	"github.com/gin-gonic/gin"
)

func GetOptions(c *gin.Context) {
	dbOptions, err := model.GetAllOption()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	options := make(map[string]string, len(dbOptions))
	for _, option := range dbOptions {
		options[option.Key] = option.Value
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    options,
	})
}

func UpdateOption(c *gin.Context) {
	var option model.Option
	err := json.NewDecoder(c.Request.Body).Decode(&option)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "invalid parameter",
		})
		return
	}
	err = model.UpdateOption(option.Key, option.Value)
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

func UpdateOptions(c *gin.Context) {
	var options map[string]string
	err := json.NewDecoder(c.Request.Body).Decode(&options)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "invalid parameter",
		})
		return
	}
	err = model.UpdateOptions(options)
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
