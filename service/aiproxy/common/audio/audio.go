package audio

import (
	"errors"
	"io"
	"os/exec"
	"strconv"
	"strings"

	"github.com/labring/sealos/service/aiproxy/common/config"
)

var ErrAudioDurationNAN = errors.New("audio duration is N/A")

func GetAudioDuration(audio io.Reader) (float64, error) {
	if !config.FfprobeEnabled {
		return 0, nil
	}

	ffprobeCmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-select_streams", "a:0",
		"-show_entries", "stream=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		"-i", "-",
	)
	ffprobeCmd.Stdin = audio
	output, err := ffprobeCmd.Output()
	if err != nil {
		return 0, err
	}

	str := strings.TrimSpace(string(output))

	if str == "" || str == "N/A" {
		return 0, ErrAudioDurationNAN
	}

	duration, err := strconv.ParseFloat(str, 64)
	if err != nil {
		return 0, err
	}
	return duration, nil
}

func GetAudioDurationFromFilePath(filePath string) (float64, error) {
	if !config.FfprobeEnabled {
		return 0, nil
	}

	ffprobeCmd := exec.Command(
		"ffprobe",
		"-v", "error",
		"-select_streams", "a:0",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		"-i", filePath,
	)
	output, err := ffprobeCmd.Output()
	if err != nil {
		return 0, err
	}

	str := strings.TrimSpace(string(output))

	if str == "" || str == "N/A" {
		return 0, ErrAudioDurationNAN
	}

	duration, err := strconv.ParseFloat(str, 64)
	if err != nil {
		return 0, err
	}
	return duration, nil
}
