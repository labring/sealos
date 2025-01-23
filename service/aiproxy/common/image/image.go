package image

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"

	// import gif decoder
	_ "image/gif"
	// import jpeg decoder
	_ "image/jpeg"
	// import png decoder
	_ "image/png"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/labring/sealos/service/aiproxy/common"

	// import webp decoder
	_ "golang.org/x/image/webp"
)

// Regex to match data URL pattern
var dataURLPattern = regexp.MustCompile(`data:image/([^;]+);base64,(.*)`)

func IsImageURL(resp *http.Response) bool {
	return strings.HasPrefix(resp.Header.Get("Content-Type"), "image/")
}

func GetImageSizeFromURL(url string) (width int, height int, err error) {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return 0, 0, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("status code: %d", resp.StatusCode)
	}

	isImage := IsImageURL(resp)
	if !isImage {
		return
	}
	img, _, err := image.DecodeConfig(resp.Body)
	if err != nil {
		return
	}
	return img.Width, img.Height, nil
}

const (
	MaxImageSize = 1024 * 1024 * 5 // 5MB
)

func GetImageFromURL(ctx context.Context, url string) (string, string, error) {
	// Check if the URL is a data URL
	matches := dataURLPattern.FindStringSubmatch(url)
	if len(matches) == 3 {
		// URL is a data URL
		return "image/" + matches[1], matches[2], nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("status code: %d", resp.StatusCode)
	}
	isImage := IsImageURL(resp)
	if !isImage {
		return "", "", errors.New("not an image")
	}
	var buf []byte
	if resp.ContentLength <= 0 {
		buf, err = io.ReadAll(common.LimitReader(resp.Body, MaxImageSize))
		if err != nil {
			if errors.Is(err, common.ErrLimitedReaderExceeded) {
				return "", "", fmt.Errorf("image too large, max: %d", MaxImageSize)
			}
			return "", "", fmt.Errorf("image read failed: %w", err)
		}
	} else {
		if resp.ContentLength > MaxImageSize {
			return "", "", fmt.Errorf("image too large: %d, max: %d", resp.ContentLength, MaxImageSize)
		}
		buf = make([]byte, resp.ContentLength)
		_, err = io.ReadFull(resp.Body, buf)
	}
	if err != nil {
		return "", "", err
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
	return GetImageSizeFromURL(image)
}
