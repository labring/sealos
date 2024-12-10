package router

import (
	"github.com/gin-contrib/gzip"
	"github.com/labring/sealos/service/aiproxy/common/env"
	"github.com/labring/sealos/service/aiproxy/controller"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/gin-gonic/gin"
)

func SetAPIRouter(router *gin.Engine) {
	api := router.Group("/api")
	if env.Bool("GZIP_ENABLED", false) {
		api.Use(gzip.Gzip(gzip.DefaultCompression))
	}

	healthRouter := api.Group("")
	healthRouter.GET("/status", controller.GetStatus)

	apiRouter := api.Group("")
	apiRouter.Use(middleware.AdminAuth)
	{
		modelsRoute := apiRouter.Group("/models")
		{
			modelsRoute.GET("/builtin", controller.BuiltinModels)
			modelsRoute.GET("/builtin/channel", controller.ChannelBuiltinModels)
			modelsRoute.GET("/builtin/channel/:type", controller.ChannelBuiltinModelsByType)
			modelsRoute.GET("/enabled", controller.EnabledModels)
			modelsRoute.GET("/enabled/channel", controller.ChannelEnabledModels)
			modelsRoute.GET("/enabled/channel/:type", controller.ChannelEnabledModelsByType)
			modelsRoute.GET("/default", controller.ChannelDefaultModelsAndMapping)
			modelsRoute.GET("/default/:type", controller.ChannelDefaultModelsAndMappingByType)
		}

		groupsRoute := apiRouter.Group("/groups")
		{
			groupsRoute.GET("/", controller.GetGroups)
			groupsRoute.GET("/search", controller.SearchGroups)
			groupsRoute.POST("/batch_delete", controller.DeleteGroups)
		}
		groupRoute := apiRouter.Group("/group")
		{
			groupRoute.POST("/", controller.CreateGroup)
			groupRoute.GET("/:id", controller.GetGroup)
			groupRoute.DELETE("/:id", controller.DeleteGroup)
			groupRoute.POST("/:id/status", controller.UpdateGroupStatus)
			groupRoute.POST("/:id/qpm", controller.UpdateGroupQPM)
		}

		optionRoute := apiRouter.Group("/option")
		{
			optionRoute.GET("/", controller.GetOptions)
			optionRoute.PUT("/", controller.UpdateOption)
			optionRoute.PUT("/batch", controller.UpdateOptions)
		}

		channelsRoute := apiRouter.Group("/channels")
		{
			channelsRoute.GET("/", controller.GetChannels)
			channelsRoute.GET("/all", controller.GetAllChannels)
			channelsRoute.GET("/type_names", controller.ChannelTypeNames)
			channelsRoute.POST("/", controller.AddChannels)
			channelsRoute.GET("/search", controller.SearchChannels)
			channelsRoute.GET("/update_balance", controller.UpdateAllChannelsBalance)
			channelsRoute.POST("/batch_delete", controller.DeleteChannels)
			channelsRoute.GET("/test", controller.TestAllChannels)
		}
		channelRoute := apiRouter.Group("/channel")
		{
			channelRoute.GET("/:id", controller.GetChannel)
			channelRoute.POST("/", controller.AddChannel)
			channelRoute.PUT("/:id", controller.UpdateChannel)
			channelRoute.POST("/:id/status", controller.UpdateChannelStatus)
			channelRoute.DELETE("/:id", controller.DeleteChannel)
			channelRoute.GET("/:id/test", controller.TestChannelModels)
			channelRoute.GET("/:id/test/:model", controller.TestChannel)
			channelRoute.GET("/:id/update_balance", controller.UpdateChannelBalance)
		}

		tokensRoute := apiRouter.Group("/tokens")
		{
			tokensRoute.GET("/", controller.GetTokens)
			tokensRoute.GET("/:id", controller.GetToken)
			tokensRoute.PUT("/:id", controller.UpdateToken)
			tokensRoute.POST("/:id/status", controller.UpdateTokenStatus)
			tokensRoute.POST("/:id/name", controller.UpdateTokenName)
			tokensRoute.DELETE("/:id", controller.DeleteToken)
			tokensRoute.GET("/search", controller.SearchTokens)
			tokensRoute.POST("/batch_delete", controller.DeleteTokens)
		}
		tokenRoute := apiRouter.Group("/token")
		{
			tokenRoute.GET("/:group/search", controller.SearchGroupTokens)
			tokenRoute.POST("/:group/batch_delete", controller.DeleteGroupTokens)
			tokenRoute.GET("/:group", controller.GetGroupTokens)
			tokenRoute.GET("/:group/:id", controller.GetGroupToken)
			tokenRoute.POST("/:group", controller.AddToken)
			tokenRoute.PUT("/:group/:id", controller.UpdateGroupToken)
			tokenRoute.POST("/:group/:id/status", controller.UpdateGroupTokenStatus)
			tokenRoute.POST("/:group/:id/name", controller.UpdateGroupTokenName)
			tokenRoute.DELETE("/:group/:id", controller.DeleteGroupToken)
		}

		logsRoute := apiRouter.Group("/logs")
		{
			logsRoute.GET("/", controller.GetLogs)
			logsRoute.DELETE("/", controller.DeleteHistoryLogs)
			logsRoute.GET("/search", controller.SearchLogs)
			logsRoute.GET("/consume_error", controller.SearchConsumeError)
		}
		logRoute := apiRouter.Group("/log")
		{
			logRoute.GET("/:group/search", controller.SearchGroupLogs)
			logRoute.GET("/:group", controller.GetGroupLogs)
		}

		modelConfigsRoute := apiRouter.Group("/model_configs")
		{
			modelConfigsRoute.GET("/", controller.GetModelConfigs)
			modelConfigsRoute.GET("/search", controller.SearchModelConfigs)
			modelConfigsRoute.GET("/all", controller.GetAllModelConfigs)
			modelConfigsRoute.POST("/contains", controller.GetModelConfigsByModelsContains)
			modelConfigsRoute.POST("/", controller.SaveModelConfigs)
			modelConfigsRoute.POST("/batch_delete", controller.DeleteModelConfigs)
		}
		modelConfigRoute := apiRouter.Group("/model_config")
		{
			modelConfigRoute.GET("/:model", controller.GetModelConfig)
			modelConfigRoute.POST("/", controller.SaveModelConfig)
			modelConfigRoute.DELETE("/:model", controller.DeleteModelConfig)
		}
	}
}
