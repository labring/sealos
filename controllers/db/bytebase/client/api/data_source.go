package api

// DataSourceType is the type for data source.
type DataSourceType string

const (
	// DataSourceAdmin is the ADMIN type of data source.
	DataSourceAdmin DataSourceType = "ADMIN"
	// DataSourceRO is the read-only type of data source.
	DataSourceRO DataSourceType = "READ_ONLY"
)

// DataSourceMessage is the API message for a data source.
type DataSourceMessage struct {
	Title    string         `json:"title"`
	Type     DataSourceType `json:"type"`
	Username string         `json:"username"`
	Password string         `json:"password"`
	SslCa    string         `json:"sslCa"`
	SslCert  string         `json:"sslCert"`
	SslKey   string         `json:"sslKey"`
	Host     string         `json:"host"`
	Port     string         `json:"port"`
	Database string         `json:"database"`
}
