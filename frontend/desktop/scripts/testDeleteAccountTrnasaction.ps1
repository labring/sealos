$desktopHostName = Read-Host "输入域名"
$start = Read-Host "输入开始"
$url = "https://${desktopHostName}/api/auth/password"
$tokenUrl = "https://${desktopHostName}/api/auth/regionToken"
$deleteAccountUrl = "https://${desktopHostName}/api/auth/delete"
Write-Host $url
$requests = 500
$batchSize = 20
$delay = 5

for ($i = $start; $i -lt $requests; $i += $batchSize) {
		
	foreach ($num in ($i..($i + $batchSize))) {
		$body = @{
			"user"     = "test${num}test"
			"password" = "test${num}test"
		} | ConvertTo-Json
		# Start-Job -ScriptBlock {
		$result = Invoke-WebRequest -Uri $url -Body $body -ContentType 'application/json'
		$token = [URI]::EscapeDataString( ($result.Content | ConvertFrom-Json).data.token)
		Write-Host 'password result'
		Write-Host $token
		$result2 = Invoke-WebRequest -Uri $tokenUrl  -Headers @{
			'Authorization' = $token
		}
		Write-Host 'regiontoken result'
		Write-Host $result2.Content
		$token = [URI]::EscapeDataString( ($result2.Content | ConvertFrom-Json).data.token)
		$result3 = Invoke-WebRequest -Uri $deleteAccountUrl -Headers @{
			'Authorization' = $token
		}
		Write-Host 'delete result'
		Write-Host $result3.Content
		# }
	}
    
	# Start-Sleep -Seconds $delay
}
