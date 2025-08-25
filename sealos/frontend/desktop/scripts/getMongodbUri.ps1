$_mongodbUri = (kubectl.exe get secret/desktop-frontend-secret -nsealos -o json | 
ConvertFrom-Json).data.mongodb_uri
Write-Host $_mongodbUri
$mongodbUri = ConvertFrom-Base64ToString $_mongodbUri
Write-Host $mongodbUri
