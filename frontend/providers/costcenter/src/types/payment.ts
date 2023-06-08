export type Payment = {
	"paymentName": "ec66fdeb-e105-4b1d-9dff-52c082ae2bdf",
	"extra": {
		"apiVersion": "account.sealos.io/v1",
		"kind": "Payment",
		"metadata": unknown,
		"spec": {
			"amount": number,
			"paymentMethod": string,
			"userID": string
		}
	}
}
export type Pay = {
	"codeURL": string,
	"status"?: "Created" | "SUCCESS",
	"tradeNO": string
}