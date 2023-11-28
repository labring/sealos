package api

import (
	"fmt"
	"net/http"

	"github.com/labring/sealos/service/account/dao"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/helper"
)

func GetBillingHistoryNamespaceList(c *gin.Context) {
	// Parse the namespace billing history request
	req, err := helper.ParseNamespaceBillingHistoryRequest(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse namespace billing history request: %v", err)})
		return
	}

	// Get the billing history namespace list from the database
	nsList, err := dao.DbClient.GetBillingHistoryNamespaceList(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get namespace billing history list: %v", err)})
		return
	}

	// Return the namespace billing history list as JSON response
	c.JSON(http.StatusOK, gin.H{
		"data": map[string]interface{}{
			"list": nsList,
		},
		"message": "successfully retrieved namespace billing history list",
	})
}
