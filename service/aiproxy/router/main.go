package router

import (
	"github.com/gin-gonic/gin"
)

func SetRouter(router *gin.Engine) {
	SetAPIRouter(router)
	SetRelayRouter(router)
}
