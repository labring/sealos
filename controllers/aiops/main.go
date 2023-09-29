package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	openai "github.com/sashabaranov/go-openai"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
	"net/http"
	"os"
)

var (
	function = []openai.FunctionDefinition{{
		Name:        "set_app_config",
		Description: "设置应用的配置",
		Parameters: json.RawMessage(`{
			"type": "object",
			"properties": {
				"app_name": {
					"type": "string",
					"description": "应用名称"
				},
				"image_name": {
					"type": "string",
					"description": "镜像名称"
				},
				"instance": {
					"type": "integer",
					"description": "实例数量",
					"minimum": 1,
					"maximum": 5
				},
				"cpu": {
					"type": "number",
					"enum": [0.1, 0.2, 0.5, 1],
					"description": "CPU 核心数量"
				},
				"memory": {
					"type": "string",
					"enum": ["64M", "128M", "256M", "512M", "1G"],
					"description": "内存量"
				},
				"container_port": {
					"type": "integer",
					"description": "容器暴露端口"
				},
				"public_access": {
					"type": "boolean",
					"description": "可外网访问"
				},
				"command": {
					"type": "string",
					"description": "运行命令"
				},
				"parameters": {
					"type": "string",
					"description": "命令参数"
				},
				"environment": {
					"type": "array",
					"description": "环境变量",
					"items": {
						"type": "object",
						"properties": {
							"name": {
								"type": "string",
								"description": "变量名称"
							},
							"value": {
								"type": "string",
								"description": "变量值"
							}
						}
					}
				},
				"configmap": {
					"type": "array",
					"description": "配置文件",
					"items": {
						"type": "object",
						"properties": {
							"file_path": {
								"type": "string",
								"description": "文件路径"
							},
							"file_content": {
								"type": "string",
								"description": "文件内容"
							}
						}
					}
				},
				"storage": {
					"type": "array",
					"description": "存储卷",
					"items": {
						"type": "object",
						"properties": {
							"capacity": {
								"type": "integer",
								"description": "容量",
								"minimum": 1,
								"maximum": 5
							},
							"mount_path": {
								"type": "string",
								"description": "挂载路径"
							}
						}
					}
				}
			},
			"required": ["image_name"]
			}`),
	}}
)

type Request struct {
	UserInput       string `json:"user_input"`
	OpenaiToken     string `json:"openai_token"`
	ParentMessageId string `json:"parent_message_id"`
	Params          Params `json:"params"`
}

type Params struct {
	AppName       string        `json:"app_name"`
	ImageName     string        `json:"image_name"`
	Instance      int           `json:"instance"`
	CPU           float64       `json:"cpu"`
	Memory        string        `json:"memory"`
	ContainerPort int           `json:"container_port"`
	PublicAccess  bool          `json:"public_access"`
	Command       string        `json:"command"`
	Parameters    string        `json:"parameters"`
	Environment   []Environment `json:"environment"`
	ConfigMap     []ConfigMap   `json:"configmap"`
	Storage       []Storage     `json:"storage"`
}

type Environment struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ConfigMap struct {
	FilePath    string `json:"file_path"`
	FileContent string `json:"file_content"`
}

type Storage struct {
	Capacity  int    `json:"capacity"`
	MountPath string `json:"mount_path"`
}

type Message struct {
	ParentMessageId string                       `json:"parent_message_id"`
	MessageId       string                       `json:"message_id"`
	UserReq         openai.ChatCompletionMessage `json:"user_req"`
	AiResp          openai.ChatCompletionMessage `json:"ai_resp"`
}

type Result struct {
	GenParamsStr string
	MessageId    string
}

type Server struct {
	DBClient *mongo.Client
}

func NewServer(dbUri string) *Server {
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(dbUri).SetServerAPIOptions(serverAPI)
	// Create a new client and connect to the server
	dbClient, err := mongo.Connect(context.TODO(), opts)
	if err != nil {
		panic(err)
	}
	err = dbClient.Database("admin").RunCommand(context.TODO(), bson.D{{"ping", 1}}).Err()
	if err != nil {
		panic(err)
	}
	return &Server{
		DBClient: dbClient,
	}
}

func (s *Server) Close() {
	err := s.DBClient.Disconnect(context.TODO())
	if err != nil {
		panic(err)
	}
}

func (s *Server) Gen(c *gin.Context) {
	collection := s.DBClient.Database("aiops").Collection("messages")

	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paramsData, err := json.Marshal(req.Params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	userInput := req.UserInput
	openaiToken := req.OpenaiToken
	parentMessageId := req.ParentMessageId
	messageId := uuid.New().String()

	// ToDo: 根据 userInput 在知识库中查询已有的应用配置信息
	// 若查询为空，则根据 userInput 在外网中查询该应用的镜像列表，相关信息等

	var messages []openai.ChatCompletionMessage
	parentMessageIdTmp := parentMessageId
	for parentMessageIdTmp != "" {
		var parentMessage Message
		err := collection.FindOne(context.TODO(), bson.M{"messageid": parentMessageIdTmp}).Decode(&parentMessage)
		if err != nil {
			panic(err)
		}
		messages = append([]openai.ChatCompletionMessage{parentMessage.UserReq, parentMessage.AiResp}, messages...)
		parentMessageIdTmp = parentMessage.ParentMessageId
	}

	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: "当前应用配置信息为：" + string(paramsData) + "\n请修改配置信息，使其尽可能地满足用户的要求！",
	})

	userMsg := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: userInput,
	}
	messages = append(messages, userMsg)

	initSystemMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: "请根据用户的请求设置应用的配置信息。",
	}
	messages = append([]openai.ChatCompletionMessage{initSystemMessage}, messages...)

	openaiReq := openai.ChatCompletionRequest{
		Model:        openai.GPT3Dot5Turbo,
		Messages:     messages,
		Functions:    function,
		FunctionCall: json.RawMessage(`{"name": "set_app_config"}`),
		Temperature:  0.3,
	}

	client := openai.NewClient(openaiToken)
	resp, err := client.CreateChatCompletion(context.Background(), openaiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	responseMessage := resp.Choices[0].Message

	var genParams Params
	err = json.Unmarshal([]byte(responseMessage.FunctionCall.Arguments), &genParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// ToDo: 精处理 gpt 生成的配置信息...
	// 如：genParams.AppName = ... // 处理逻辑
	//genParamsData, err := json.Marshal(genParams)
	//if err != nil {
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	//	return
	//}
	//genParamsStr := string(genParamsData)
	//responseMessage.FunctionCall.Arguments = genParamsStr

	msg := Message{
		ParentMessageId: parentMessageId,
		MessageId:       messageId,
		UserReq:         userMsg,
		AiResp:          responseMessage,
	}

	_, err = collection.InsertOne(context.TODO(), msg)
	if err != nil {
		log.Fatal(err)
	}

	resData, err := json.Marshal(Result{
		MessageId:    messageId,
		GenParamsStr: responseMessage.FunctionCall.Arguments,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	fmt.Println(resData)
	//c.JSON(http.StatusOK, gin.H{"data": resData})
	c.String(http.StatusOK, string(resData))
}

func main() {
	//os.Setenv("MONGO_URI", "mongodb+srv://lifu963:819169@cluster0.ible30p.mongodb.net/?retryWrites=true&w=majority")
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		panic("MONGO_URI 环境变量未设置")
	}
	server := NewServer(mongoURI)
	defer func() {
		server.Close()
	}()

	r := gin.Default()
	r.POST("/gen", server.Gen)

	log.Fatal(r.Run(":8080"))
}
