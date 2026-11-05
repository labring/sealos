package api

type JSONQuery struct {
	Key string
	// There are a total of four modes,"=" equal,"!" Not equal,"~" including,"!~" Not included.
	Mode  string
	Value string
}

type VlogsLaunchpadRequest struct {
	Time        string      `json:"time"`
	Namespace   string      `json:"namespace"`
	App         string      `json:"app"`
	Limit       string      `json:"limit,omitempty"`
	JSONMode    string      `json:"jsonMode,omitempty"`
	StderrMode  string      `json:"stderrMode,omitempty"`
	NumberMode  string      `json:"numberMode,omitempty"`
	NumberLevel string      `json:"numberLevel,omitempty"`
	Pod         []string    `json:"pod,omitempty"`
	Container   []string    `json:"container,omitempty"`
	Keyword     string      `json:"keyword,omitempty"`
	JSONQuery   []JSONQuery `json:"jsonQuery,omitempty"`
	PodQuery    string      `json:"podQuery,omitempty"`
	StartTime   string      `json:"startTime,omitempty"`
	EndTime     string      `json:"endTime,omitempty"`
}

type VlogsDatabaseRequest struct {
	Time        string   `json:"time"`
	Namespace   string   `json:"namespace"`
	Limit       string   `json:"limit,omitempty"`
	NumberMode  string   `json:"numberMode,omitempty"`
	NumberLevel string   `json:"numberLevel,omitempty"`
	Pvc         []string `json:"pvc,omitempty"`
	Type        []string `json:"type,omitempty"`
	Container   []string `json:"container,omitempty"`
	Keyword     string   `json:"keyword,omitempty"`
	StartTime   string   `json:"startTime,omitempty"`
	EndTime     string   `json:"endTime,omitempty"`
}

type VlogsLaunchpadResponse struct {
	Time      string `json:"_time"`
	Message   string `json:"_msg"`
	Container string `json:"container"`
	Pod       string `json:"pod"`
	Stream    string `json:"stream"`
}
