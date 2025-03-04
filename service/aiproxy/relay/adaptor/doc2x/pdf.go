package doc2x

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/bytedance/sonic"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertParsePdfRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	err := req.ParseMultipartForm(1024 * 1024 * 4)
	if err != nil {
		return "", nil, nil, err
	}

	file, _, err := req.FormFile("file")
	if err != nil {
		return "", nil, nil, err
	}

	responseFormat := req.FormValue("response_format")
	meta.Set("response_format", responseFormat)

	return http.MethodPost, nil, file, nil
}

type ParsePdfResponse struct {
	Code string               `json:"code"`
	Data ParsePdfResponseData `json:"data"`
	Msg  string               `json:"msg"`
}

type ParsePdfResponseData struct {
	Uid string `json:"uid"`
}

func HandleParsePdfResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	var response ParsePdfResponse
	err := sonic.ConfigDefault.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return nil, openai.ErrorWrapperWithMessage("decode response failed: "+err.Error(), "decode_response_failed", http.StatusBadRequest)
	}

	if response.Code != "success" {
		return nil, openai.ErrorWrapperWithMessage("parse pdf failed: "+response.Msg, "parse_pdf_failed", http.StatusBadRequest)
	}

	for {
		status, err := GetStatus(context.Background(), meta, response.Data.Uid)
		if err != nil {
			return nil, openai.ErrorWrapperWithMessage("get status failed: "+err.Error(), "get_status_failed", http.StatusInternalServerError)
		}

		switch status.Status {
		case StatusResponseDataStatusSuccess:
			return handleParsePdfResponse(meta, c, status.Result)
		case StatusResponseDataStatusProcessing:
			time.Sleep(1 * time.Second)
		case StatusResponseDataStatusFailed:
			return nil, openai.ErrorWrapperWithMessage("parse pdf failed: "+status.Detail, "parse_pdf_failed", http.StatusBadRequest)
		}
	}
}

func handleParsePdfResponse(meta *meta.Meta, c *gin.Context, response *StatusResponseDataResult) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	mds := make([]string, 0, len(response.Pages))
	totalLength := 0
	for _, page := range response.Pages {
		mds = append(mds, page.MD)
		totalLength += len(page.MD)
	}
	pages := len(response.Pages)

	switch meta.GetString("response_format") {
	case "list":
		c.JSON(http.StatusOK, relaymodel.ParsePdfListResponse{
			Markdowns: mds,
		})
	default:
		builder := strings.Builder{}
		builder.Grow(totalLength)
		for _, md := range mds {
			builder.WriteString(md)
		}
		c.JSON(http.StatusOK, relaymodel.ParsePdfResponse{
			Pages:    pages,
			Markdown: builder.String(),
		})
	}

	return &relaymodel.Usage{
		PromptTokens: pages,
		TotalTokens:  pages,
	}, nil
}

type StatusResponse struct {
	Code string              `json:"code"`
	Msg  string              `json:"msg"`
	Data *StatusResponseData `json:"data"`
}

const (
	StatusResponseDataStatusSuccess    = "success"
	StatusResponseDataStatusProcessing = "processing"
	StatusResponseDataStatusFailed     = "failed"
)

type StatusResponseData struct {
	Progress int                       `json:"progress"`
	Status   string                    `json:"status"`
	Detail   string                    `json:"detail"`
	Result   *StatusResponseDataResult `json:"result"`
}

type StatusResponseDataResult struct {
	Version string                         `json:"version"`
	Pages   []StatusResponseDataResultPage `json:"pages"`
}

type StatusResponseDataResultPage struct {
	URL        string `json:"url"`
	PageIdx    int    `json:"page_idx"`
	PageWidth  int    `json:"page_width"`
	PageHeight int    `json:"page_height"`
	MD         string `json:"md"`
}

func GetStatus(ctx context.Context, meta *meta.Meta, uid string) (*StatusResponseData, error) {
	url := fmt.Sprintf("%s/api/v2/parse/status?uid=%s", meta.Channel.BaseURL, uid)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response StatusResponse
	err = sonic.ConfigDefault.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return nil, err
	}

	if response.Code != "success" {
		return nil, errors.New("get status failed: " + response.Msg)
	}

	return response.Data, nil
}
