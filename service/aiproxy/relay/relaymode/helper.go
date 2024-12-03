package relaymode

import "strings"

func GetByPath(path string) int {
	switch {
	case strings.HasPrefix(path, "/v1/chat/completions"):
		return ChatCompletions
	case strings.HasPrefix(path, "/v1/completions"):
		return Completions
	case strings.HasSuffix(path, "embeddings"):
		return Embeddings
	case strings.HasPrefix(path, "/v1/moderations"):
		return Moderations
	case strings.HasPrefix(path, "/v1/images/generations"):
		return ImagesGenerations
	case strings.HasPrefix(path, "/v1/edits"):
		return Edits
	case strings.HasPrefix(path, "/v1/audio/speech"):
		return AudioSpeech
	case strings.HasPrefix(path, "/v1/audio/transcriptions"):
		return AudioTranscription
	case strings.HasPrefix(path, "/v1/audio/translations"):
		return AudioTranslation
	case strings.HasPrefix(path, "/v1/rerank"):
		return Rerank
	default:
		return Unknown
	}
}
