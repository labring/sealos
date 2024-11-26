package price

import "github.com/labring/sealos/service/aiproxy/common/config"

// 单个图片的价格
var imageSizePrices = map[string]map[string]float64{
	"dall-e-2": {
		"256x256":   1,
		"512x512":   1.125,
		"1024x1024": 1.25,
	},
	"dall-e-3": {
		"1024x1024": 1,
		"1024x1792": 2,
		"1792x1024": 2,
	},
	"ali-stable-diffusion-xl": {
		"512x1024":  1,
		"1024x768":  1,
		"1024x1024": 1,
		"576x1024":  1,
		"1024x576":  1,
	},
	"ali-stable-diffusion-v1.5": {
		"512x1024":  1,
		"1024x768":  1,
		"1024x1024": 1,
		"576x1024":  1,
		"1024x576":  1,
	},
	"wanx-v1": {
		"1024x1024": 1,
		"720x1280":  1,
		"1280x720":  1,
	},
	"step-1x-medium": {
		"256x256":   1,
		"512x512":   1,
		"768x768":   1,
		"1024x1024": 1,
		"1280x800":  1,
		"800x1280":  1,
	},
}

var imageGenerationAmounts = map[string][2]int{
	"dall-e-2":                  {1, 10},
	"dall-e-3":                  {1, 1}, // OpenAI allows n=1 currently.
	"ali-stable-diffusion-xl":   {1, 4}, // Ali
	"ali-stable-diffusion-v1.5": {1, 4}, // Ali
	"wanx-v1":                   {1, 4}, // Ali
	"cogview-3":                 {1, 1},
	"step-1x-medium":            {1, 1},
}

var imagePromptLengthLimitations = map[string]int{
	"dall-e-2":                  1000,
	"dall-e-3":                  4000,
	"ali-stable-diffusion-xl":   4000,
	"ali-stable-diffusion-v1.5": 4000,
	"wanx-v1":                   4000,
	"cogview-3":                 833,
	"step-1x-medium":            4000,
}

var imageOriginModelName = map[string]string{
	"ali-stable-diffusion-xl":   "stable-diffusion-xl",
	"ali-stable-diffusion-v1.5": "stable-diffusion-v1.5",
}

func GetImageOriginModelName() map[string]string {
	return imageOriginModelName
}

func IsValidImageSize(model string, size string) bool {
	if !config.GetBillingEnabled() {
		return true
	}
	if model == "cogview-3" || imageSizePrices[model] == nil {
		return true
	}
	_, ok := imageSizePrices[model][size]
	return ok
}

func IsValidImagePromptLength(model string, promptLength int) bool {
	if !config.GetBillingEnabled() {
		return true
	}
	maxPromptLength, ok := imagePromptLengthLimitations[model]
	return !ok || promptLength <= maxPromptLength
}

func IsWithinRange(element string, value int) bool {
	if !config.GetBillingEnabled() {
		return true
	}
	amounts, ok := imageGenerationAmounts[element]
	return !ok || (value >= amounts[0] && value <= amounts[1])
}

func GetImageSizePrice(model string, size string) float64 {
	if !config.GetBillingEnabled() {
		return 0
	}
	if price, ok := imageSizePrices[model][size]; ok {
		return price
	}
	return 1
}
