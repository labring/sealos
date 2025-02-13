package router

import (
	"github.com/labring/sealos/service/aiproxy/controller"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"

	"github.com/gin-gonic/gin"
)

func SetRelayRouter(router *gin.Engine) {
	// https://platform.openai.com/docs/api-reference/introduction
	v1Router := router.Group("/v1")
	v1Router.Use(middleware.TokenAuth)

	modelsRouter := v1Router.Group("/models")
	{
		modelsRouter.GET("", controller.ListModels)
		modelsRouter.GET("/:model", controller.RetrieveModel)
	}
	dashboardRouter := v1Router.Group("/dashboard")
	{
		dashboardRouter.GET("/billing/subscription", controller.GetSubscription)
		dashboardRouter.GET("/billing/usage", controller.GetUsage)
	}
	relayRouter := v1Router.Group("")
	{
		relayRouter.POST(
			"/completions",
			middleware.NewDistribute(relaymode.Completions),
			controller.NewRelay(relaymode.Completions),
		)

		relayRouter.POST(
			"/chat/completions",
			middleware.NewDistribute(relaymode.ChatCompletions),
			controller.NewRelay(relaymode.ChatCompletions),
		)
		relayRouter.POST(
			"/edits",
			middleware.NewDistribute(relaymode.Edits),
			controller.NewRelay(relaymode.Edits),
		)
		relayRouter.POST(
			"/images/generations",
			middleware.NewDistribute(relaymode.ImagesGenerations),
			controller.NewRelay(relaymode.ImagesGenerations),
		)
		relayRouter.POST(
			"/embeddings",
			middleware.NewDistribute(relaymode.Embeddings),
			controller.NewRelay(relaymode.Embeddings),
		)
		relayRouter.POST(
			"/engines/:model/embeddings",
			middleware.NewDistribute(relaymode.Embeddings),
			controller.NewRelay(relaymode.Embeddings),
		)
		relayRouter.POST(
			"/audio/transcriptions",
			middleware.NewDistribute(relaymode.AudioTranscription),
			controller.NewRelay(relaymode.AudioTranscription),
		)
		relayRouter.POST(
			"/audio/translations",
			middleware.NewDistribute(relaymode.AudioTranslation),
			controller.NewRelay(relaymode.AudioTranslation),
		)
		relayRouter.POST(
			"/audio/speech",
			middleware.NewDistribute(relaymode.AudioSpeech),
			controller.NewRelay(relaymode.AudioSpeech),
		)
		relayRouter.POST(
			"/rerank",
			middleware.NewDistribute(relaymode.Rerank),
			controller.NewRelay(relaymode.Rerank),
		)
		relayRouter.POST(
			"/moderations",
			middleware.NewDistribute(relaymode.Moderations),
			controller.NewRelay(relaymode.Moderations),
		)

		relayRouter.POST("/images/edits", controller.RelayNotImplemented)
		relayRouter.POST("/images/variations", controller.RelayNotImplemented)
		relayRouter.GET("/files", controller.RelayNotImplemented)
		relayRouter.POST("/files", controller.RelayNotImplemented)
		relayRouter.DELETE("/files/:id", controller.RelayNotImplemented)
		relayRouter.GET("/files/:id", controller.RelayNotImplemented)
		relayRouter.GET("/files/:id/content", controller.RelayNotImplemented)
		relayRouter.POST("/fine_tuning/jobs", controller.RelayNotImplemented)
		relayRouter.GET("/fine_tuning/jobs", controller.RelayNotImplemented)
		relayRouter.GET("/fine_tuning/jobs/:id", controller.RelayNotImplemented)
		relayRouter.POST("/fine_tuning/jobs/:id/cancel", controller.RelayNotImplemented)
		relayRouter.GET("/fine_tuning/jobs/:id/events", controller.RelayNotImplemented)
		relayRouter.DELETE("/models/:model", controller.RelayNotImplemented)
		relayRouter.POST("/assistants", controller.RelayNotImplemented)
		relayRouter.GET("/assistants/:id", controller.RelayNotImplemented)
		relayRouter.POST("/assistants/:id", controller.RelayNotImplemented)
		relayRouter.DELETE("/assistants/:id", controller.RelayNotImplemented)
		relayRouter.GET("/assistants", controller.RelayNotImplemented)
		relayRouter.POST("/assistants/:id/files", controller.RelayNotImplemented)
		relayRouter.GET("/assistants/:id/files/:fileId", controller.RelayNotImplemented)
		relayRouter.DELETE("/assistants/:id/files/:fileId", controller.RelayNotImplemented)
		relayRouter.GET("/assistants/:id/files", controller.RelayNotImplemented)
		relayRouter.POST("/threads", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id", controller.RelayNotImplemented)
		relayRouter.POST("/threads/:id", controller.RelayNotImplemented)
		relayRouter.DELETE("/threads/:id", controller.RelayNotImplemented)
		relayRouter.POST("/threads/:id/messages", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id/messages/:messageId", controller.RelayNotImplemented)
		relayRouter.POST("/threads/:id/messages/:messageId", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id/messages/:messageId/files/:filesId", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id/messages/:messageId/files", controller.RelayNotImplemented)
		relayRouter.POST("/threads/:id/runs", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id/runs/:runsId", controller.RelayNotImplemented)
		relayRouter.POST("/threads/:id/runs/:runsId", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id/runs", controller.RelayNotImplemented)
		relayRouter.POST("/threads/:id/runs/:runsId/submit_tool_outputs", controller.RelayNotImplemented)
		relayRouter.POST("/threads/:id/runs/:runsId/cancel", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id/runs/:runsId/steps/:stepId", controller.RelayNotImplemented)
		relayRouter.GET("/threads/:id/runs/:runsId/steps", controller.RelayNotImplemented)
	}
}
