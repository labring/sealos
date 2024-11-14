package router

import (
	"github.com/gin-gonic/gin"
)

func SetRouter(router *gin.Engine) {
	SetApiRouter(router)
	SetRelayRouter(router)
}
