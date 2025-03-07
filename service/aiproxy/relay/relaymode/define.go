package relaymode

import "fmt"

type Mode int

func (m Mode) String() string {
	switch m {
	case Unknown:
		return "Unknown"
	case ChatCompletions:
		return "ChatCompletions"
	case Completions:
		return "Completions"
	case Embeddings:
		return "Embeddings"
	case Moderations:
		return "Moderations"
	case ImagesGenerations:
		return "ImagesGenerations"
	case Edits:
		return "Edits"
	case AudioSpeech:
		return "AudioSpeech"
	case AudioTranscription:
		return "AudioTranscription"
	case AudioTranslation:
		return "AudioTranslation"
	case Rerank:
		return "Rerank"
	case ParsePdf:
		return "ParsePdf"
	default:
		return fmt.Sprintf("Mode(%d)", m)
	}
}

const (
	Unknown Mode = iota
	ChatCompletions
	Completions
	Embeddings
	Moderations
	ImagesGenerations
	Edits
	AudioSpeech
	AudioTranscription
	AudioTranslation
	Rerank
	ParsePdf
)
