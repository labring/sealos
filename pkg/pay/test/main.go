package main

import (
	"fmt"
	"os"
	"path"
	"runtime"

	"github.com/labring/sealos/pkg/pay"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()
	// 获取当前文件运行的路径
	_, filename, _, _ := runtime.Caller(0)
	dir := path.Join(path.Dir(filename), "templates")

	// 加载HTML目录
	router.LoadHTMLGlob(dir + "/*")

	router.GET("/", func(c *gin.Context) {
		// 渲染index.html文件
		c.HTML(200, "index.html", nil)
	})

	router.POST("/create-checkout-session", func(c *gin.Context) {
		s, err := pay.CreateCheckoutSession(2000, "cny", "https://cloud.sealos.io", "https://cloud.sealos.io")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		fmt.Println("Successfully created checkout session:", s.ID)
		c.JSON(200, gin.H{"sessionId": s.ID})
	})
	//get session
	router.GET("/get-session", func(c *gin.Context) {
		sessionID := c.Query("session_id")
		ses, err := pay.GetSession(sessionID)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		fmt.Println("Successfully created get session:", ses)
		c.JSON(200, gin.H{"message": "ok", "status": ses.Status})
	})
	//expire session
	router.GET("/expire-session", func(c *gin.Context) {
		sessionID := c.Query("session_id")
		ses, err := pay.ExpireSession(sessionID)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		fmt.Println("Successfully expire session:", ses)
		c.JSON(200, gin.H{"message": "ok", "status": ses.Status})
	})

	err := router.Run(":8080")
	if err != nil {
		fmt.Println("Error running server:", err)
		os.Exit(1)
	}
}
