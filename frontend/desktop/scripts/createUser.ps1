$desktopHostName = Read-Host "输入域名"
$url = "https://${desktopHostName}/api/auth/password"
$tokenUrl = "https://${desktopHostName}/api/auth/regionToken"
Write-Host $url
$requests = 500
$batchSize = 20
$delay = 5

for ($i = 0; $i -lt $requests; $i += $batchSize) {
		
	foreach ($num in ($i..($i + $batchSize))) {
		$body = @{
			"user"     = "test${num}test"
			"password" = "test${num}test"
		} | ConvertTo-Json
		# Start-Job -ScriptBlock {
			$result = Invoke-WebRequest -Uri $url -Body $body -ContentType 'application/json'
			$token = [URI]::EscapeDataString( ($result.Content | ConvertFrom-Json).data.token)
			Write-Host $token
			$result2 = Invoke-WebRequest -Uri $tokenUrl  -Headers @{
				'Authorization' = $token
			}
			Write-Host $result2.Content
		# }
	}
    
	# Start-Sleep -Seconds $delay
}
