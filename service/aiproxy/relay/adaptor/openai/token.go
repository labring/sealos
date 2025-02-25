package openai

import (
	"errors"
	"math"
	"strings"
	"sync"
	"unicode/utf8"

	"github.com/labring/sealos/service/aiproxy/common/image"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/pkoukk/tiktoken-go"
	log "github.com/sirupsen/logrus"
)

// tokenEncoderMap won't grow after initialization
var (
	tokenEncoderMap     = map[string]*tiktoken.Tiktoken{}
	defaultTokenEncoder *tiktoken.Tiktoken
	tokenEncoderLock    sync.RWMutex
)

func init() {
	gpt35TokenEncoder, err := tiktoken.EncodingForModel("gpt-3.5-turbo")
	if err != nil {
		log.Fatal("failed to get gpt-3.5-turbo token encoder: " + err.Error())
	}
	defaultTokenEncoder = gpt35TokenEncoder
}

func getTokenEncoder(model string) *tiktoken.Tiktoken {
	tokenEncoderLock.RLock()
	tokenEncoder, ok := tokenEncoderMap[model]
	tokenEncoderLock.RUnlock()
	if ok {
		return tokenEncoder
	}

	tokenEncoderLock.Lock()
	defer tokenEncoderLock.Unlock()
	if tokenEncoder, ok := tokenEncoderMap[model]; ok {
		return tokenEncoder
	}

	tokenEncoder, err := tiktoken.EncodingForModel(model)
	if err != nil {
		log.Warnf("failed to get token encoder for model %s: %v, using encoder for gpt-3.5-turbo", model, err)
		tokenEncoder = defaultTokenEncoder
	}
	tokenEncoderMap[model] = tokenEncoder
	return tokenEncoder
}

func getTokenNum(tokenEncoder *tiktoken.Tiktoken, text string) int {
	return len(tokenEncoder.Encode(text, nil, nil))
}

func CountTokenMessages(messages []*model.Message, model string) int {
	tokenEncoder := getTokenEncoder(model)
	// Reference:
	// https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
	// https://github.com/pkoukk/tiktoken-go/issues/6
	//
	// Every message follows <|start|>{role/name}\n{content}<|end|>\n
	var tokensPerMessage int
	var tokensPerName int
	if model == "gpt-3.5-turbo-0301" {
		tokensPerMessage = 4
		tokensPerName = -1 // If there's a name, the role is omitted
	} else {
		tokensPerMessage = 3
		tokensPerName = 1
	}
	tokenNum := 0
	for _, message := range messages {
		tokenNum += tokensPerMessage
		switch v := message.Content.(type) {
		case string:
			tokenNum += getTokenNum(tokenEncoder, v)
		case []any:
			for _, it := range v {
				m, ok := it.(map[string]any)
				if !ok {
					continue
				}
				switch m["type"] {
				case "text":
					if textValue, ok := m["text"]; ok {
						if textString, ok := textValue.(string); ok {
							tokenNum += getTokenNum(tokenEncoder, textString)
						}
					}
				case "image_url":
					imageURL, ok := m["image_url"].(map[string]any)
					if ok {
						url, ok := imageURL["url"].(string)
						if !ok {
							continue
						}
						detail := ""
						if imageURL["detail"] != nil {
							detail, ok = imageURL["detail"].(string)
							if !ok {
								continue
							}
						}
						imageTokens, err := countImageTokens(url, detail, model)
						if err != nil {
							log.Error("error counting image tokens: " + err.Error())
						} else {
							tokenNum += imageTokens
						}
					}
				}
			}
		}
		tokenNum += getTokenNum(tokenEncoder, message.Role)
		if message.Name != nil {
			tokenNum += tokensPerName
			tokenNum += getTokenNum(tokenEncoder, *message.Name)
		}
	}
	tokenNum += 3 // Every reply is primed with <|start|>assistant<|message|>
	return tokenNum
}

const (
	lowDetailCost         = 85
	highDetailCostPerTile = 170
	additionalCost        = 85
	// gpt-4o-mini cost higher than other model
	gpt4oMiniLowDetailCost  = 2833
	gpt4oMiniHighDetailCost = 5667
	gpt4oMiniAdditionalCost = 2833
)

// https://platform.openai.com/docs/guides/vision/calculating-costs
// https://github.com/openai/openai-cookbook/blob/05e3f9be4c7a2ae7ecf029a7c32065b024730ebe/examples/How_to_count_tokens_with_tiktoken.ipynb
func countImageTokens(url string, detail string, model string) (_ int, err error) {
	fetchSize := true
	var width, height int
	// Reference: https://platform.openai.com/docs/guides/vision/low-or-high-fidelity-image-understanding
	// detail == "auto" is undocumented on how it works, it just said the model will use the auto setting which will look at the image input size and decide if it should use the low or high setting.
	// According to the official guide, "low" disable the high-res model,
	// and only receive low-res 512px x 512px version of the image, indicating
	// that image is treated as low-res when size is smaller than 512px x 512px,
	// then we can assume that image size larger than 512px x 512px is treated
	// as high-res. Then we have the following logic:
	// if detail == "" || detail == "auto" {
	// 	width, height, err = image.GetImageSize(url)
	// 	if err != nil {
	// 		return 0, err
	// 	}
	// 	fetchSize = false
	// 	// not sure if this is correct
	// 	if width > 512 || height > 512 {
	// 		detail = "high"
	// 	} else {
	// 		detail = "low"
	// 	}
	// }

	// However, in my test, it seems to be always the same as "high".
	// The following image, which is 125x50, is still treated as high-res, taken
	// 255 tokens in the response of non-stream chat completion api.
	// https://upload.wikimedia.org/wikipedia/commons/1/10/18_Infantry_Division_Messina.jpg
	if detail == "" || detail == "auto" {
		// assume by test, not sure if this is correct
		detail = "high"
	}
	switch detail {
	case "low":
		if strings.HasPrefix(model, "gpt-4o-mini") {
			return gpt4oMiniLowDetailCost, nil
		}
		return lowDetailCost, nil
	case "high":
		if fetchSize {
			width, height, err = image.GetImageSize(url)
			if err != nil {
				return 0, err
			}
		}
		if width > 2048 || height > 2048 { // max(width, height) > 2048
			ratio := float64(2048) / math.Max(float64(width), float64(height))
			width = int(float64(width) * ratio)
			height = int(float64(height) * ratio)
		}
		if width > 768 && height > 768 { // min(width, height) > 768
			ratio := float64(768) / math.Min(float64(width), float64(height))
			width = int(float64(width) * ratio)
			height = int(float64(height) * ratio)
		}
		numSquares := int(math.Ceil(float64(width)/512) * math.Ceil(float64(height)/512))
		if strings.HasPrefix(model, "gpt-4o-mini") {
			return numSquares*gpt4oMiniHighDetailCost + gpt4oMiniAdditionalCost, nil
		}
		result := numSquares*highDetailCostPerTile + additionalCost
		return result, nil
	default:
		return 0, errors.New("invalid detail option")
	}
}

func CountTokenInput(input any, model string) int {
	switch v := input.(type) {
	case string:
		return CountTokenText(v, model)
	case []any:
		num := 0
		for _, s := range v {
			num += CountTokenInput(s, model)
		}
		return num
	case []string:
		text := ""
		for _, s := range v {
			text += s
		}
		return CountTokenText(text, model)
	}
	return 0
}

func CountTokenText(text string, model string) int {
	if strings.HasPrefix(model, "tts") {
		return utf8.RuneCountInString(text)
	}
	return getTokenNum(getTokenEncoder(model), text)
}

func CountToken(text string) int {
	return CountTokenInput(text, "gpt-3.5-turbo")
}
