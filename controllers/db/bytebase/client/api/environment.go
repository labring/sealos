package api

// EnvironmentMessage is the API message for an environment.
type EnvironmentMessage struct {
	UID string `json:"uid"`

	// Domain specific fields
	Name  string `json:"name"`
	Title string `json:"title"`
	Order int    `json:"order"`
	State State  `json:"state,omitempty"`
	Tier  string `json:"tier"`
}

// ListEnvironmentMessage is the API message for list environment response.
type ListEnvironmentMessage struct {
	Environments  []*EnvironmentMessage `json:"environments"`
	NextPageToken string                `json:"nextPageToken"`
}

// EnvironmentPatchMessage is the API message to patch the environment.
type EnvironmentPatchMessage struct {
	Title *string `json:"title,omitempty"`
	Order *int    `json:"order,omitempty"`
	Tier  *string `json:"tier,omitempty"`
}
