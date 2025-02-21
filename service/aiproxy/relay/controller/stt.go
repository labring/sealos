package controller

import (
	"errors"
	"fmt"
	"math"
	"mime/multipart"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/audio"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

func RelaySTTHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
	return Handle(meta, c, func() (*PreCheckGroupBalanceReq, error) {
		price, completionPrice, ok := GetModelPrice(meta.ModelConfig)
		if !ok {
			return nil, fmt.Errorf("model price not found: %s", meta.OriginModel)
		}

		audioFile, err := c.FormFile("file")
		if err != nil {
			return nil, fmt.Errorf("failed to get audio file: %w", err)
		}

		duration, err := getAudioDuration(audioFile)
		if err != nil {
			return nil, err
		}

		durationInt := int(math.Ceil(duration))
		log := middleware.GetLogger(c)
		log.Data["duration"] = durationInt

		return &PreCheckGroupBalanceReq{
			InputTokens: durationInt,
			InputPrice:  price,
			OutputPrice: completionPrice,
		}, nil
	})
}

func getAudioDuration(audioFile *multipart.FileHeader) (float64, error) {
	// Try to get duration directly from audio data
	audioData, err := audioFile.Open()
	if err != nil {
		return 0, fmt.Errorf("failed to open audio file: %w", err)
	}
	defer audioData.Close()

	// If it's already an os.File, use file path method
	if osFile, ok := audioData.(*os.File); ok {
		duration, err := audio.GetAudioDurationFromFilePath(osFile.Name())
		if err != nil {
			return 0, fmt.Errorf("failed to get audio duration from temp file: %w", err)
		}
		return duration, nil
	}

	// Try to get duration from audio data
	duration, err := audio.GetAudioDuration(audioData)
	if err == nil {
		return duration, nil
	}

	// If duration is NaN, create temp file and try again
	if errors.Is(err, audio.ErrAudioDurationNAN) {
		return getDurationFromTempFile(audioFile)
	}

	return 0, fmt.Errorf("failed to get audio duration: %w", err)
}

func getDurationFromTempFile(audioFile *multipart.FileHeader) (float64, error) {
	tempFile, err := os.CreateTemp("", "audio.wav")
	if err != nil {
		return 0, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	newAudioData, err := audioFile.Open()
	if err != nil {
		return 0, fmt.Errorf("failed to open audio file: %w", err)
	}
	defer newAudioData.Close()

	if _, err = tempFile.ReadFrom(newAudioData); err != nil {
		return 0, fmt.Errorf("failed to read from temp file: %w", err)
	}

	duration, err := audio.GetAudioDurationFromFilePath(tempFile.Name())
	if err != nil {
		return 0, fmt.Errorf("failed to get audio duration from temp file: %w", err)
	}

	return duration, nil
}
