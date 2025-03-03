package controller

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func parsePageParams(c *gin.Context) (page, perPage int) {
	page, _ = strconv.Atoi(c.Query("p"))
	if page <= 0 {
		page = 1
	}

	perPage, _ = strconv.Atoi(c.Query("per_page"))
	if perPage <= 0 {
		perPage = 10
	} else if perPage > 100 {
		perPage = 100
	}
	return
}
