$url = $env:baseurl  # 替换为目标 URL
Write-Output $url
$payload = @{
	msg_type = "text"
	content  = @{ 
		post = @{ 
			zh_cn = @{ 
				title   = "New Invoice"
				content = @(
					@((@(
							@{ 
								tag  = "text"
								text = "xxxxxx" 
							}
						)) | ConvertTo-Json
					)
				)
			} 
		} 
	} 
} | ConvertTo-Json -Depth 100

$headers = @{
	"Content-Type" = "application/json"
}
write-host $payload
$response = Invoke-RestMethod -Uri $url -Method Post -Body $payload -Headers $headers
write-host $response
