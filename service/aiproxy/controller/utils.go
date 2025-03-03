package controller

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func parsePageParams(c *gin.Context) (page, perPage int) {
	page, _ = strconv.Atoi(c.Query("p"))
	perPage, _ = strconv.Atoi(c.Query("per_page"))
	return
}
