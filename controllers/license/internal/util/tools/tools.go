package tools

func ContainsFields(data map[string]interface{}, fields ...string) bool {
	for _, field := range fields {
		_, ok := data[field]
		if !ok {
			return false
		}
	}
	return true
}
