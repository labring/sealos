package license

type payloadKey string

const (
	CreatTimeField payloadKey = "iat"
	AmountField    payloadKey = "amt"
	NodeField      payloadKey = "nod"
	CPUField       payloadKey = "cpu"
	DurationField  payloadKey = "tte"
	AddNodeField   payloadKey = "and"
	AddCPUField    payloadKey = "adc"
)
