package model

import "reflect"

//nolint:revive
type ModelConfigKey string

const (
	ModelConfigMaxContextTokensKey ModelConfigKey = "max_context_tokens"
	ModelConfigMaxInputTokensKey   ModelConfigKey = "max_input_tokens"
	ModelConfigMaxOutputTokensKey  ModelConfigKey = "max_output_tokens"
	ModelConfigVisionKey           ModelConfigKey = "vision"
	ModelConfigToolChoiceKey       ModelConfigKey = "tool_choice"
	ModelConfigSupportFormatsKey   ModelConfigKey = "support_formats"
	ModelConfigSupportVoicesKey    ModelConfigKey = "support_voices"
)

//nolint:revive
type ModelConfigOption func(config map[ModelConfigKey]any)

func WithModelConfigMaxContextTokens(maxContextTokens int) ModelConfigOption {
	return func(config map[ModelConfigKey]any) {
		config[ModelConfigMaxContextTokensKey] = maxContextTokens
	}
}

func WithModelConfigMaxInputTokens(maxInputTokens int) ModelConfigOption {
	return func(config map[ModelConfigKey]any) {
		config[ModelConfigMaxInputTokensKey] = maxInputTokens
	}
}

func WithModelConfigMaxOutputTokens(maxOutputTokens int) ModelConfigOption {
	return func(config map[ModelConfigKey]any) {
		config[ModelConfigMaxOutputTokensKey] = maxOutputTokens
	}
}

func WithModelConfigVision(vision bool) ModelConfigOption {
	return func(config map[ModelConfigKey]any) {
		config[ModelConfigVisionKey] = vision
	}
}

func WithModelConfigToolChoice(toolChoice bool) ModelConfigOption {
	return func(config map[ModelConfigKey]any) {
		config[ModelConfigToolChoiceKey] = toolChoice
	}
}

func WithModelConfigSupportFormats(supportFormats []string) ModelConfigOption {
	return func(config map[ModelConfigKey]any) {
		config[ModelConfigSupportFormatsKey] = supportFormats
	}
}

func WithModelConfigSupportVoices(supportVoices []string) ModelConfigOption {
	return func(config map[ModelConfigKey]any) {
		config[ModelConfigSupportVoicesKey] = supportVoices
	}
}

func NewModelConfig(opts ...ModelConfigOption) map[ModelConfigKey]any {
	config := make(map[ModelConfigKey]any)
	for _, opt := range opts {
		opt(config)
	}
	return config
}

func GetModelConfigInt(config map[ModelConfigKey]any, key ModelConfigKey) (int, bool) {
	if v, ok := config[key]; ok {
		value := reflect.ValueOf(v)
		if value.CanInt() {
			return int(value.Int()), true
		}
		if value.CanFloat() {
			return int(value.Float()), true
		}
	}
	return 0, false
}

func GetModelConfigUint(config map[ModelConfigKey]any, key ModelConfigKey) (uint64, bool) {
	if v, ok := config[key]; ok {
		value := reflect.ValueOf(v)
		if value.CanUint() {
			return value.Uint(), true
		}
		if value.CanFloat() {
			return uint64(value.Float()), true
		}
	}
	return 0, false
}

func GetModelConfigFloat(config map[ModelConfigKey]any, key ModelConfigKey) (float64, bool) {
	if v, ok := config[key]; ok {
		value := reflect.ValueOf(v)
		if value.CanFloat() {
			return value.Float(), true
		}
		if value.CanInt() {
			return float64(value.Int()), true
		}
		if value.CanUint() {
			return float64(value.Uint()), true
		}
	}
	return 0, false
}

func GetModelConfigStringSlice(config map[ModelConfigKey]any, key ModelConfigKey) ([]string, bool) {
	v, ok := config[key]
	if !ok {
		return nil, false
	}
	if slice, ok := v.([]string); ok {
		return slice, true
	}
	if slice, ok := v.([]any); ok {
		result := make([]string, len(slice))
		for i, v := range slice {
			if s, ok := v.(string); ok {
				result[i] = s
				continue
			}
			return nil, false
		}
		return result, true
	}
	return nil, false
}

func GetModelConfigBool(config map[ModelConfigKey]any, key ModelConfigKey) (bool, bool) {
	if v, ok := config[key].(bool); ok {
		return v, true
	}
	return false, false
}
