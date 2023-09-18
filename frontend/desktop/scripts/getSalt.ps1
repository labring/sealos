$_salt = (kubectl.exe get secret/desktop-frontend-secret -nsealos -o json | 
ConvertFrom-Json).data.jwt_secret
Write-Host $_salt
$salt = ConvertFrom-Base64ToString $_salt
Write-Host $salt
