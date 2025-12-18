package rwords

import (
	"fmt"
)

const listLength = len(wordsList)

// data size is 2048*2048*21^4=815,712,436,224
// compare to 8 random characters, data size is 36^8 = 208,827,064,576
// outputs looks like: "abandon-ability-abcd"
func GenerateRandomWords() string {
	return fmt.Sprintf("%s-%s-%s", wordsList[Intn(listLength)], wordsList[Intn(listLength)], String(4))
}
