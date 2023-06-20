package api

// RoleAttribute is the attribute for role.
type RoleAttribute struct {
	SuperUser   bool `json:"superUser"`
	NoInherit   bool `json:"noInherit"`
	CreateRole  bool `json:"createRole"`
	CreateDB    bool `json:"createDb"`
	CanLogin    bool `json:"canLogin"`
	Replication bool `json:"replication"`
	ByPassRLS   bool `json:"bypassRls"`
}

// Role is the API message for role.
type Role struct {
	Name            string         `json:"name"`
	RoleName        string         `json:"roleName"`
	ConnectionLimit int            `json:"connectionLimit"`
	ValidUntil      *string        `json:"validUntil"`
	Attribute       *RoleAttribute `json:"attribute"`
}

// RoleUpsert is the API message for upserting a new role.
type RoleUpsert struct {
	RoleName        string         `json:"roleName"`
	Password        *string        `json:"password"`
	ConnectionLimit *int           `json:"connectionLimit"`
	ValidUntil      *string        `json:"validUntil"`
	Attribute       *RoleAttribute `json:"attribute"`
}
