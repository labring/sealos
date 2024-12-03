package deepl

type Request struct {
	TargetLang string   `json:"target_lang"`
	Text       []string `json:"text"`
}

type Translation struct {
	DetectedSourceLanguage string `json:"detected_source_language,omitempty"`
	Text                   string `json:"text,omitempty"`
}

type Response struct {
	Message      string        `json:"message,omitempty"`
	Translations []Translation `json:"translations,omitempty"`
}
