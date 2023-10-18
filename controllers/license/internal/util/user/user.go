package user

// user stored in mongoDB.
type User struct {
	UID          string    `bson:"uid" json:"uid"`
	Name         string    `bson:"name" json:"name"`
	PasswordUser string    `bson:"password_user" json:"password_user"`
	Password     string    `bson:"password" json:"password"`
	CreatedTime  string    `bson:"created_time" json:"created_time"`
	K8sUsers     []K8sUser `bson:"k8s_users" json:"k8s_users"`
}

type K8sUser struct {
	Name string `bson:"name" json:"name"`
}

const (
	// pre-defined user info
	DefaultUser     = "admin"
	DefaultPassword = "sealos2023"
	DefaultK8sUser  = "admin"
)
