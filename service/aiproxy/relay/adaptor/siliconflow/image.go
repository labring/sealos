package siliconflow

import (
	"bytes"
	"io"
	"net/http"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
)

type ImageRequest struct {
	Model             string `json:"model"`
	Prompt            string `json:"prompt"`
	NegativePrompt    string `json:"negative_prompt"`
	ImageSize         string `json:"image_size"`
	BatchSize         int    `json:"batch_size"`
	Seed              int64  `json:"seed"`
	NumInferenceSteps int    `json:"num_inference_steps"`
	GuidanceScale     int    `json:"guidance_scale"`
	PromptEnhancement bool   `json:"prompt_enhancement"`
}

func ConvertImageRequest(meta *meta.Meta, request *http.Request) (http.Header, io.Reader, error) {
	var reqMap map[string]any
	err := common.UnmarshalBodyReusable(request, &reqMap)
	if err != nil {
		return nil, nil, err
	}

	meta.Set(openai.MetaResponseFormat, reqMap["response_format"])

	reqMap["model"] = meta.ActualModel
	reqMap["batch_size"] = reqMap["n"]
	delete(reqMap, "n")
	if _, ok := reqMap["steps"]; ok {
		reqMap["num_inference_steps"] = reqMap["steps"]
		delete(reqMap, "steps")
	}
	if _, ok := reqMap["scale"]; ok {
		reqMap["guidance_scale"] = reqMap["scale"]
		delete(reqMap, "scale")
	}
	reqMap["image_size"] = reqMap["size"]
	delete(reqMap, "size")

	data, err := json.Marshal(&reqMap)
	if err != nil {
		return nil, nil, err
	}
	return http.Header{}, bytes.NewReader(data), nil
}
