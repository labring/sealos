package openai

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/image"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertImageRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return "", nil, nil, err
	}
	meta.Set(MetaResponseFormat, reqMap["response_format"])

	reqMap["model"] = meta.ActualModel
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(jsonData), nil
}

func ImageHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseFormat := meta.GetString(MetaResponseFormat)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	var imageResponse ImageResponse
	err = json.Unmarshal(responseBody, &imageResponse)
	if err != nil {
		return nil, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	usage := &model.Usage{
		PromptTokens: len(imageResponse.Data),
		TotalTokens:  len(imageResponse.Data),
	}

	if responseFormat == "b64_json" {
		for _, data := range imageResponse.Data {
			if len(data.B64Json) > 0 {
				continue
			}
			_, data.B64Json, err = image.GetImageFromURL(c.Request.Context(), data.URL)
			if err != nil {
				return usage, ErrorWrapper(err, "get_image_from_url_failed", http.StatusInternalServerError)
			}
		}
	}

	data, err := json.Marshal(imageResponse)
	if err != nil {
		return usage, ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}

	_, err = c.Writer.Write(data)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return usage, nil
}
