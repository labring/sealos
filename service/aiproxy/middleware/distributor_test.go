package middleware_test

import (
	"encoding/json"
	"strings"
	"testing"

	jsoniter "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/middleware"
)

func StdGetModelFromJSON(body []byte) (string, error) {
	var modelRequest middleware.ModelRequest
	err := json.Unmarshal(body, &modelRequest)
	if err != nil {
		return "", err
	}
	return modelRequest.Model, nil
}

func JSONIterGetModelFromJSON(body []byte) (string, error) {
	return jsoniter.Get(body, "model").ToString(), nil
}

func BenchmarkCompareGetModelFromJSON(b *testing.B) {
	tests := []struct {
		name string
		json string
	}{
		{
			name: "ValidModel",
			json: `{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}`,
		},
		{
			name: "NoModel",
			json: `{"messages": [{"role": "user", "content": "Hello"}]}`,
		},
		{
			name: "EmptyJSON",
			json: `{}`,
		},
		{
			name: "LargeJSON",
			json: `{"model": "gpt-4","messages": [{"role": "user", "content": "` + strings.Repeat("x", 1000) + `"}]}`,
		},
		{
			name: "LargeJSON2",
			json: `{"messages": [{"role": "user", "content": "` + strings.Repeat("x", 1000) + `"}],"model": "gpt-4"}`,
		},
		{
			name: "VeryLargeJSON",
			json: `{"model": "gpt-4","messages": [{"role": "user", "content": "` + strings.Repeat("x", 10000) + `"}]}`,
		},
		{
			name: "VeryLargeJSON2",
			json: `{"messages": [{"role": "user", "content": "` + strings.Repeat("x", 10000) + `"}],"model": "gpt-4"}`,
		},
	}

	for _, tt := range tests {
		jsonBytes := []byte(tt.json)

		b.Run(tt.name+"/Std", func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				_, _ = StdGetModelFromJSON(jsonBytes)
			}
		})

		b.Run(tt.name+"/JSONIter", func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				_, _ = JSONIterGetModelFromJSON(jsonBytes)
			}
		})

		b.Run(tt.name+"/Sonic", func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				_, _ = middleware.GetModelFromJSON(jsonBytes)
			}
		})
	}
}
