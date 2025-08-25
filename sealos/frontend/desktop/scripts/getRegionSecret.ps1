$secret_data = (kubectl get secret desktop-frontend-secret -nsealos -ojson | ConvertFrom-Json).data
Write-Host  "JWT_SECRET_REGION=$($secret_data.JWT_SECRET_REGION)"
Write-Host  "PASSWORD_SALT=$($secret_data.PASSWORD_SALT)"