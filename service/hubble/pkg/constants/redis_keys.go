package constants

const (
	// OutboundSetKeyPattern Outbound flow set key pattern: {namespace}-{pod}-from
	OutboundSetKeyPattern = "%s-%s-from"

	// InboundSetKeyPattern Inbound flow set key pattern: {namespace}-{pod}-to
	InboundSetKeyPattern = "%s-%s-to"

	// OutboundFlowKeyPattern Outbound flow data key pattern: {namespace}-{fromPod}-{toPod}
	OutboundFlowKeyPattern = "%s-%s-%s"

	// InboundFlowKeyPattern Inbound flow data key pattern: {fromPod}-{namespace}-{toPod}
	InboundFlowKeyPattern = "%s-%s-%s"
)
