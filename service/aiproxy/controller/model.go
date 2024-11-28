package controller

import (
	"fmt"
	"net/http"
	"slices"
	"sort"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/model"
	relay "github.com/labring/sealos/service/aiproxy/relay"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/apitype"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://platform.openai.com/docs/api-reference/models/list

type OpenAIModelPermission struct {
	Group              *string `json:"group"`
	ID                 string  `json:"id"`
	Object             string  `json:"object"`
	Organization       string  `json:"organization"`
	Created            int     `json:"created"`
	AllowCreateEngine  bool    `json:"allow_create_engine"`
	AllowSampling      bool    `json:"allow_sampling"`
	AllowLogprobs      bool    `json:"allow_logprobs"`
	AllowSearchIndices bool    `json:"allow_search_indices"`
	AllowView          bool    `json:"allow_view"`
	AllowFineTuning    bool    `json:"allow_fine_tuning"`
	IsBlocking         bool    `json:"is_blocking"`
}

type OpenAIModels struct {
	Parent     *string                 `json:"parent"`
	ID         string                  `json:"id"`
	Object     string                  `json:"object"`
	OwnedBy    string                  `json:"owned_by"`
	Root       string                  `json:"root"`
	Permission []OpenAIModelPermission `json:"permission"`
	Created    int                     `json:"created"`
}

var (
	models           []OpenAIModels
	modelsMap        map[string]OpenAIModels
	channelID2Models map[int][]*model.ModelConfigItem
)

func init() {
	var permission []OpenAIModelPermission
	permission = append(permission, OpenAIModelPermission{
		ID:                 "modelperm-LwHkVFn8AcMItP432fKKDIKJ",
		Object:             "model_permission",
		Created:            1626777600,
		AllowCreateEngine:  true,
		AllowSampling:      true,
		AllowLogprobs:      true,
		AllowSearchIndices: false,
		AllowView:          true,
		AllowFineTuning:    false,
		Organization:       "*",
		Group:              nil,
		IsBlocking:         false,
	})
	// https://platform.openai.com/docs/models/model-endpoint-compatibility
	for i := 0; i < apitype.Dummy; i++ {
		if i == apitype.AIProxyLibrary {
			continue
		}
		adaptor := relay.GetAdaptor(i)
		adaptor.Init(&meta.Meta{
			ChannelType: i,
		})
		channelName := adaptor.GetChannelName()
		modelNames := adaptor.GetModelList()
		for _, model := range modelNames {
			models = append(models, OpenAIModels{
				ID:         model.Model,
				Object:     "model",
				Created:    1626777600,
				OwnedBy:    channelName,
				Permission: permission,
				Root:       model.Model,
				Parent:     nil,
			})
		}
	}
	for _, channelType := range openai.CompatibleChannels {
		if channelType == channeltype.Azure {
			continue
		}
		channelName, channelModelList := openai.GetCompatibleChannelMeta(channelType)
		for _, model := range channelModelList {
			models = append(models, OpenAIModels{
				ID:         model.Model,
				Object:     "model",
				Created:    1626777600,
				OwnedBy:    channelName,
				Permission: permission,
				Root:       model.Model,
				Parent:     nil,
			})
		}
	}
	modelsMap = make(map[string]OpenAIModels)
	for _, model := range models {
		modelsMap[model.ID] = model
	}
	channelID2Models = make(map[int][]*model.ModelConfigItem)
	for i := 1; i < channeltype.Dummy; i++ {
		adaptor := relay.GetAdaptor(channeltype.ToAPIType(i))
		meta := &meta.Meta{
			ChannelType: i,
		}
		adaptor.Init(meta)
		channelID2Models[i] = adaptor.GetModelList()
	}
	for _, models := range channelID2Models {
		sort.Slice(models, func(i, j int) bool {
			return models[i].Model < models[j].Model
		})
	}
}

func BuiltinModels(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    channelID2Models,
	})
}

func BuiltinModelsByType(c *gin.Context) {
	channelType := c.Param("type")
	if channelType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "type is required",
		})
		return
	}
	channelTypeInt, err := strconv.Atoi(channelType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "invalid type",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    channelID2Models[channelTypeInt],
	})
}

func ChannelDefaultModelsAndMapping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"models":  config.GetDefaultChannelModels(),
			"mapping": config.GetDefaultChannelModelMapping(),
		},
	})
}

func ChannelDefaultModelsAndMappingByType(c *gin.Context) {
	channelType := c.Param("type")
	if channelType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "type is required",
		})
		return
	}
	channelTypeInt, err := strconv.Atoi(channelType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "invalid type",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"models":  config.GetDefaultChannelModels()[channelTypeInt],
			"mapping": config.GetDefaultChannelModelMapping()[channelTypeInt],
		},
	})
}

func EnabledModels(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    model.CacheGetAllModelsAndConfig(),
	})
}

func ChannelEnabledModels(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    model.CacheGetAllChannelModelsAndConfig(),
	})
}

func ListModels(c *gin.Context) {
	availableModels := c.GetStringSlice(ctxkey.AvailableModels)
	availableOpenAIModels := make([]OpenAIModels, 0, len(availableModels))

	for _, modelName := range availableModels {
		if model, ok := modelsMap[modelName]; ok {
			availableOpenAIModels = append(availableOpenAIModels, model)
			continue
		}
		availableOpenAIModels = append(availableOpenAIModels, OpenAIModels{
			ID:      modelName,
			Object:  "model",
			Created: 1626777600,
			OwnedBy: "custom",
			Root:    modelName,
			Parent:  nil,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"object": "list",
		"data":   availableOpenAIModels,
	})
}

func RetrieveModel(c *gin.Context) {
	modelID := c.Param("model")
	model, ok := modelsMap[modelID]
	if !ok || !slices.Contains(c.GetStringSlice(ctxkey.AvailableModels), modelID) {
		c.JSON(200, gin.H{
			"error": relaymodel.Error{
				Message: fmt.Sprintf("the model '%s' does not exist", modelID),
				Type:    "invalid_request_error",
				Param:   "model",
				Code:    "model_not_found",
			},
		})
		return
	}
	c.JSON(200, model)
}
