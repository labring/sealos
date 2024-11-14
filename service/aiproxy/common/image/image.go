package image

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/labring/sealos/service/aiproxy/common/client"

	_ "golang.org/x/image/webp"
)

// Regex to match data URL pattern
var dataURLPattern = regexp.MustCompile(`data:image/([^;]+);base64,(.*)`)

func IsImageUrl(resp *http.Response) bool {
	return strings.HasPrefix(resp.Header.Get("Content-Type"), "image/")
}

func GetImageSizeFromUrl(url string) (width int, height int, err error) {
	resp, err := client.UserContentRequestHTTPClient.Get(url)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("status code: %d", resp.StatusCode)
	}

	isImage := IsImageUrl(resp)
	if !isImage {
		return
	}
	img, _, err := image.DecodeConfig(resp.Body)
	if err != nil {
		return
	}
	return img.Width, img.Height, nil
}

func GetImageFromUrl(url string) (string, string, error) {
	// Check if the URL is a data URL
	matches := dataURLPattern.FindStringSubmatch(url)
	if len(matches) == 3 {
		// URL is a data URL
		return "image/" + matches[1], matches[2], nil
	}

	resp, err := client.UserContentRequestHTTPClient.Get(url)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("status code: %d", resp.StatusCode)
	}
	var buf []byte
	if resp.ContentLength <= 0 {
		buf, err = io.ReadAll(resp.Body)
	} else {
		buf = make([]byte, resp.ContentLength)
		_, err = io.ReadFull(resp.Body, buf)
	}
	if err != nil {
		return "", "", err
	}
	isImage := IsImageUrl(resp)
	if !isImage {
		return "", "", fmt.Errorf("not an image")
	}
	return resp.Header.Get("Content-Type"), base64.StdEncoding.EncodeToString(buf), nil
}

var reg = regexp.MustCompile(`data:image/([^;]+);base64,`)

func GetImageSizeFromBase64(encoded string) (width int, height int, err error) {
	decoded, err := base64.StdEncoding.DecodeString(reg.ReplaceAllString(encoded, ""))
	if err != nil {
		return 0, 0, err
	}

	img, _, err := image.DecodeConfig(bytes.NewReader(decoded))
	if err != nil {
		return 0, 0, err
	}

	return img.Width, img.Height, nil
}

func GetImageSize(image string) (width int, height int, err error) {
	if strings.HasPrefix(image, "data:image/") {
		return GetImageSizeFromBase64(image)
	}
	return GetImageSizeFromUrl(image)
}
