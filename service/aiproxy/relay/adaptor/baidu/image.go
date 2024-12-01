package baidu

import (
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type ImageData struct {
	B64Image string `json:"b64_image"`
}

type ImageResponse struct {
	*Error
	ID      string       `json:"id"`
	Data    []*ImageData `json:"data"`
	Created int64        `json:"created"`
}

func ImageHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	var imageResponse ImageResponse
	err = json.Unmarshal(body, &imageResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	usage := &model.Usage{
		PromptTokens: len(imageResponse.Data),
		TotalTokens:  len(imageResponse.Data),
	}

	if imageResponse.Error != nil && imageResponse.Error.ErrorMsg != "" {
		return usage, openai.ErrorWrapperWithMessage(imageResponse.Error.ErrorMsg, "baidu_error:"+strconv.Itoa(imageResponse.Error.ErrorCode), http.StatusBadRequest)
	}

	openaiResponse := ToOpenAIImageResponse(&imageResponse)
	data, err := json.Marshal(openaiResponse)
	if err != nil {
		return usage, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	_, err = c.Writer.Write(data)
	if err != nil {
		logger.Error(c, "write response body failed: "+err.Error())
	}
	return usage, nil
}

func ToOpenAIImageResponse(imageResponse *ImageResponse) *openai.ImageResponse {
	response := &openai.ImageResponse{
		Created: imageResponse.Created,
	}
	for _, data := range imageResponse.Data {
		response.Data = append(response.Data, &openai.ImageData{
			B64Json: data.B64Image,
		})
	}
	return response
}
