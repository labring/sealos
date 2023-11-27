package types

type User struct {
	//UID         string    `bson:"uid" json:"uid"`
	//Name        string    `bson:"name" json:"name"`
	//Email       string    `bson:"email" json:"email"`
	Phone string `bson:"phone" json:"phone"`
	//Wechat      string    `bson:"wechat" json:"wechat"`
	//CreatedTime string    `bson:"created_time" json:"created_time"`
	K8sUsers []K8sUser `bson:"k8s_users" json:"k8s_users"`
}

type K8sUser struct {
	Name string `bson:"name" json:"name"`
}
