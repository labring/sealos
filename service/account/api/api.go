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
	req, err := helper.ParseNamespaceBillingHistoryReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse namespace billing history request: %v", err)})
		return
	}
	if err := helper.Authenticate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	// Get the billing history namespace list from the database
	nsList, err := dao.DBClient.GetBillingHistoryNamespaceList(req)
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

func GetProperties(c *gin.Context) {
	if err := helper.AuthenticateWithBind(c); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	// Get the properties from the database
	properties, err := dao.DBClient.GetProperties()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get properties: %v", err)})
		return
	}

	// Return the properties as JSON response
	c.JSON(http.StatusOK, gin.H{
		"data": map[string]interface{}{
			"properties": properties,
		},
		"message": "successfully retrieved properties",
	})
}

func GetCosts(c *gin.Context) {
	req, err := helper.ParseUserCostsAmountReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse user hour costs amount request: %v", err)})
		return
	}
	if err := helper.Authenticate(req.Auth); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	costs, err := dao.DBClient.GetCostAmount(req.Owner, req.StartTime, req.EndTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get cost : %v", err)})
	}
	c.JSON(http.StatusOK, gin.H{
		"data": map[string]interface{}{
			"costs": costs,
		},
	})
}
