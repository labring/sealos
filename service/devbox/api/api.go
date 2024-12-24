package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	tag "github.com/labring/sealos/service/devbox/pkg/registry"
)

type TagRequest struct {
	Original string `json:"original"`
	Target   string `json:"target"`
}

func Tag(c *gin.Context) {
	var request TagRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := tag.TagEngine.Tag(request.Original, request.Target); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": err.Error(),
			"code":    500,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "tag success",
		"code":    200,
	})
}
