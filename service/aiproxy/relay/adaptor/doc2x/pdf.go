package doc2x

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/bytedance/sonic"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	log "github.com/sirupsen/logrus"
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
	UID string `json:"uid"`
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
		status, err := GetStatus(context.Background(), meta, response.Data.UID)
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

// Start of Selection
var (
	tableRegex      = regexp.MustCompile(`<table>[\s\S]*?</table>`)
	rowRegex        = regexp.MustCompile(`<tr>(.*?)</tr>`)
	cellRegex       = regexp.MustCompile(`<td[^>]*/>|<td[^>]*>(.*?)</td>`)
	whitespaceRegex = regexp.MustCompile(`\n\s*`)
	tdCleanRegex    = regexp.MustCompile(`<td.*?>|</td>`)
	colspanRegex    = regexp.MustCompile(`colspan="(\d+)"`)
	rowspanRegex    = regexp.MustCompile(`rowspan="(\d+)"`)

	htmlImageRegex = regexp.MustCompile(`<img\s+src="([^"]+)"(?:\s*\?[^>]*)?(?:\s*\/>|>)`)
	imageRegex     = regexp.MustCompile(`!\[(.*?)\]\((http[^)]+)\)`)

	mediaCommentRegex    = regexp.MustCompile(`<!-- Media -->`)
	footnoteCommentRegex = regexp.MustCompile(`<!-- Footnote -->`)
)

func HTMLTable2Md(content string) string {
	return tableRegex.ReplaceAllStringFunc(content, func(htmlTable string) string {
		cleanHTML := whitespaceRegex.ReplaceAllString(htmlTable, "")
		rows := rowRegex.FindAllString(cleanHTML, -1)
		if len(rows) == 0 {
			return htmlTable
		}
		var tableData [][]string
		maxColumns := 0
		for rowIndex, row := range rows {
			for len(tableData) <= rowIndex {
				tableData = append(tableData, []string{})
			}
			colIndex := 0
			cells := cellRegex.FindAllString(row, -1)
			if len(cells) > maxColumns {
				maxColumns = len(cells)
			}
			for _, cell := range cells {
				colspan := 1
				if matches := colspanRegex.FindStringSubmatch(cell); len(matches) > 1 {
					colspan, _ = strconv.Atoi(matches[1])
				}
				rowspan := 1
				if matches := rowspanRegex.FindStringSubmatch(cell); len(matches) > 1 {
					rowspan, _ = strconv.Atoi(matches[1])
				}
				content := strings.TrimSpace(tdCleanRegex.ReplaceAllString(cell, ""))
				for i := 0; i < rowspan; i++ {
					for j := 0; j < colspan; j++ {
						for len(tableData) <= rowIndex+i {
							tableData = append(tableData, []string{})
						}
						for len(tableData[rowIndex+i]) <= colIndex+j {
							tableData[rowIndex+i] = append(tableData[rowIndex+i], "")
						}
						if i == 0 && j == 0 {
							tableData[rowIndex+i][colIndex+j] = content
						} else {
							tableData[rowIndex+i][colIndex+j] = "^^"
						}
					}
				}
				colIndex += colspan
			}
		}
		for i := range tableData {
			for len(tableData[i]) < maxColumns {
				tableData[i] = append(tableData[i], " ")
			}
		}
		var chunks []string
		headerCells := make([]string, maxColumns)
		for i := 0; i < maxColumns; i++ {
			if i < len(tableData[0]) {
				headerCells[i] = tableData[0][i]
			} else {
				headerCells[i] = " "
			}
		}
		chunks = append(chunks, fmt.Sprintf("| %s |", strings.Join(headerCells, " | ")))
		separatorCells := make([]string, maxColumns)
		for i := 0; i < maxColumns; i++ {
			separatorCells[i] = "---"
		}
		chunks = append(chunks, fmt.Sprintf("| %s |", strings.Join(separatorCells, " | ")))
		for _, row := range tableData[1:] {
			chunks = append(chunks, fmt.Sprintf("| %s |", strings.Join(row, " | ")))
		}
		return strings.Join(chunks, "\n")
	})
}

func HTMLImage2Md(content string) string {
	return htmlImageRegex.ReplaceAllString(content, "![img]($1)")
}

func InlineMdImage(ctx context.Context, text string) string {
	text = HTMLImage2Md(text)

	matches := imageRegex.FindAllStringSubmatchIndex(text, -1)
	if len(matches) == 0 {
		return text
	}

	var resultText strings.Builder
	var wg sync.WaitGroup
	var mutex sync.Mutex

	type imageInfo struct {
		startPos    int
		endPos      int
		altText     string
		url         string
		replacement string
	}

	imageInfos := make([]imageInfo, len(matches))

	for i, match := range matches {
		altTextStart, altTextEnd := match[2], match[3]
		urlStart, urlEnd := match[4], match[5]

		imageInfos[i] = imageInfo{
			startPos: match[0],
			endPos:   match[1],
			altText:  text[altTextStart:altTextEnd],
			url:      text[urlStart:urlEnd],
		}
	}

	for i := range imageInfos {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			info := &imageInfos[index]

			replacement, err := imageURL2MdBase64(ctx, info.url, info.altText)
			if err != nil {
				log.Printf("failed to process image %s: %v", info.url, err)
				// when the image is not found, keep the original link
				mutex.Lock()
				info.replacement = text[info.startPos:info.endPos]
				mutex.Unlock()
				return
			}

			mutex.Lock()
			info.replacement = replacement
			mutex.Unlock()
		}(i)
	}

	wg.Wait()

	lastPos := 0
	for _, info := range imageInfos {
		resultText.WriteString(text[lastPos:info.startPos])
		resultText.WriteString(info.replacement)
		lastPos = info.endPos
	}
	resultText.WriteString(text[lastPos:])

	return resultText.String()
}

func imageURL2MdBase64(ctx context.Context, url string, altText string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	var resp *http.Response
	var downloadErr error
	retries := 0
	maxRetries := 3

	for retries <= maxRetries {
		resp, downloadErr = http.DefaultClient.Do(req)
		if downloadErr != nil {
			return "", fmt.Errorf("failed to download image: %w", downloadErr)
		}
		if resp.StatusCode == http.StatusNotFound {
			resp.Body.Close()
			if retries == maxRetries {
				return "", fmt.Errorf("failed to download image, status code: %d after %d retries", resp.StatusCode, retries)
			}
			retries++
			time.Sleep(1 * time.Second)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return "", fmt.Errorf("failed to download image, status code: %d", resp.StatusCode)
		}
		break
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read image data: %w", err)
	}
	mime := resp.Header.Get("Content-Type")
	if mime == "" {
		mime = inferMimeType(url)
	}
	base64Data := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("![%s](data:%s;base64,%s)", altText, mime, base64Data), nil
}

func inferMimeType(u string) string {
	p, err := url.Parse(u)
	if err != nil {
		return "image/jpeg"
	}

	lowerURL := strings.ToLower(p.Path)
	switch {
	case strings.HasSuffix(lowerURL, ".png"):
		return "image/png"
	case strings.HasSuffix(lowerURL, ".gif"):
		return "image/gif"
	case strings.HasSuffix(lowerURL, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lowerURL, ".svg"):
		return "image/svg+xml"
	default:
		return "image/jpeg"
	}
}

func handleConvertPdfToMd(ctx context.Context, str string) (string, error) {
	result := InlineMdImage(ctx, str)
	result = HTMLTable2Md(result)

	result = mediaCommentRegex.ReplaceAllString(result, "")
	result = footnoteCommentRegex.ReplaceAllString(result, "")

	return result, nil
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
		for i, md := range mds {
			result, err := handleConvertPdfToMd(c.Request.Context(), md)
			if err != nil {
				return nil, openai.ErrorWrapperWithMessage("convert pdf to md failed: "+err.Error(), "convert_pdf_to_md_failed", http.StatusInternalServerError)
			}
			mds[i] = result
		}
		c.JSON(http.StatusOK, relaymodel.ParsePdfListResponse{
			Markdowns: mds,
		})
	default:
		builder := strings.Builder{}
		builder.Grow(totalLength)
		for _, md := range mds {
			builder.WriteString(md)
		}
		result, err := handleConvertPdfToMd(c.Request.Context(), builder.String())
		if err != nil {
			return nil, openai.ErrorWrapperWithMessage("convert pdf to md failed: "+err.Error(), "convert_pdf_to_md_failed", http.StatusInternalServerError)
		}
		c.JSON(http.StatusOK, relaymodel.ParsePdfResponse{
			Pages:    pages,
			Markdown: result,
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
