package controller

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"gorm.io/gorm"
)

type OneAPIChannel struct {
	Type         int               `json:"type" gorm:"default:0"`
	Key          string            `json:"key" gorm:"type:text"`
	Status       int               `json:"status" gorm:"default:1"`
	Name         string            `json:"name" gorm:"index"`
	BaseURL      string            `gorm:"column:base_url;default:''"`
	Models       string            `json:"models"`
	ModelMapping map[string]string `gorm:"type:varchar(1024);serializer:fastjson"`
	Priority     int32             `gorm:"bigint;default:0"`
	Config       ChannelConfig     `gorm:"serializer:fastjson"`
}

func (c *OneAPIChannel) TableName() string {
	return "channels"
}

type ChannelConfig struct {
	Region            string `json:"region,omitempty"`
	SK                string `json:"sk,omitempty"`
	AK                string `json:"ak,omitempty"`
	UserID            string `json:"user_id,omitempty"`
	APIVersion        string `json:"api_version,omitempty"`
	LibraryID         string `json:"library_id,omitempty"`
	VertexAIProjectID string `json:"vertex_ai_project_id,omitempty"`
	VertexAIADC       string `json:"vertex_ai_adc,omitempty"`
}

// https://github.com/songquanpeng/one-api/blob/main/relay/channeltype/define.go
const (
	OneAPIOpenAI = iota + 1
	OneAPIAPI2D
	OneAPIAzure
	OneAPICloseAI
	OneAPIOpenAISB
	OneAPIOpenAIMax
	OneAPIOhMyGPT
	OneAPICustom
	OneAPIAils
	OneAPIAIProxy
	OneAPIPaLM
	OneAPIAPI2GPT
	OneAPIAIGC2D
	OneAPIAnthropic
	OneAPIBaidu
	OneAPIZhipu
	OneAPIAli
	OneAPIXunfei
	OneAPIAI360
	OneAPIOpenRouter
	OneAPIAIProxyLibrary
	OneAPIFastGPT
	OneAPITencent
	OneAPIGemini
	OneAPIMoonshot
	OneAPIBaichuan
	OneAPIMinimax
	OneAPIMistral
	OneAPIGroq
	OneAPIOllama
	OneAPILingYiWanWu
	OneAPIStepFun
	OneAPIAwsClaude
	OneAPICoze
	OneAPICohere
	OneAPIDeepSeek
	OneAPICloudflare
	OneAPIDeepL
	OneAPITogetherAI
	OneAPIDoubao
	OneAPINovita
	OneAPIVertextAI
	OneAPIProxy
	OneAPISiliconFlow
	OneAPIXAI
	OneAPIReplicate
	OneAPIBaiduV2
	OneAPIXunfeiV2
	OneAPIAliBailian
	OneAPIOpenAICompatible
	OneAPIGeminiOpenAICompatible
)

// relay/channeltype/define.go

var OneAPIChannelType2AIProxyMap = map[int]int{
	OneAPIOpenAI:                 1,
	OneAPIAzure:                  3,
	OneAPIAnthropic:              14,
	OneAPIBaidu:                  15,
	OneAPIZhipu:                  16,
	OneAPIAli:                    17,
	OneAPIAI360:                  19,
	OneAPITencent:                23,
	OneAPIGemini:                 24,
	OneAPIMoonshot:               25,
	OneAPIBaichuan:               26,
	OneAPIMinimax:                27,
	OneAPIMistral:                28,
	OneAPIGroq:                   29,
	OneAPIOllama:                 30,
	OneAPILingYiWanWu:            31,
	OneAPIStepFun:                32,
	OneAPIAwsClaude:              33,
	OneAPICoze:                   34,
	OneAPICohere:                 35,
	OneAPIDeepSeek:               36,
	OneAPICloudflare:             37,
	OneAPIDoubao:                 40,
	OneAPINovita:                 41,
	OneAPIVertextAI:              42,
	OneAPISiliconFlow:            43,
	OneAPIBaiduV2:                13,
	OneAPIXunfeiV2:               18,
	OneAPIAliBailian:             17,
	OneAPIGeminiOpenAICompatible: 12,
	OneAPIXAI:                    45,
}

type ImportChannelFromOneAPIRequest struct {
	DSN string `json:"dsn"`
}

func AddOneAPIChannel(ch OneAPIChannel) error {
	add := AddChannelRequest{
		Type:         ch.Type,
		Name:         ch.Name,
		Key:          ch.Key,
		BaseURL:      ch.BaseURL,
		Models:       strings.Split(ch.Models, ","),
		ModelMapping: ch.ModelMapping,
		Priority:     ch.Priority,
		Status:       ch.Status,
	}
	if t, ok := OneAPIChannelType2AIProxyMap[ch.Type]; ok {
		add.Type = t
	} else {
		add.Type = 1
	}
	if add.Type == 1 && add.BaseURL != "" {
		add.BaseURL += "/v1"
	}
	chs, err := add.ToChannels()
	if err != nil {
		return err
	}
	return model.BatchInsertChannels(chs)
}

func ImportChannelFromOneAPI(c *gin.Context) {
	var req ImportChannelFromOneAPIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if req.DSN == "" {
		middleware.ErrorResponse(c, http.StatusBadRequest, "sql dsn is required")
		return
	}

	var db *gorm.DB
	var err error
	if strings.HasPrefix(req.DSN, "mysql") {
		db, err = model.OpenMySQL(req.DSN)
	} else if strings.HasPrefix(req.DSN, "postgres") {
		db, err = model.OpenPostgreSQL(req.DSN)
	} else {
		middleware.ErrorResponse(c, http.StatusBadRequest, "invalid dsn, only mysql and postgres are supported")
		return
	}
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	sqlDB, err := db.DB()
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	defer sqlDB.Close()

	allChannels := make([]*OneAPIChannel, 0)
	err = db.Model(&OneAPIChannel{}).Find(&allChannels).Error
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	errs := make([]error, 0)
	for _, ch := range allChannels {
		err := AddOneAPIChannel(*ch)
		if err != nil {
			errs = append(errs, err)
		}
	}

	middleware.SuccessResponse(c, errs)
}
