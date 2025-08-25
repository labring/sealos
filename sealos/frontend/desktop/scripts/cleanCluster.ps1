$confirm = Read-Host "！！！会删除所有的user 和 ns 是否继续执行？[Y/N]"
if ($confirm -ne "Y") {
	exit
}
$itmes = kubectl get user -o json | ConvertFrom-Json | Select-Object { $_.items }
foreach ($item in $items) {
	$name = $item.metadata.name
	if ($name -ne "admin") {
		kubectl.exe delete user $name
	}
}
$items = kubectl get ns -o json | 
ConvertFrom-Json | 
Select-Object { $_.items } | 
Where-Object { $_.metadata.name -match "ns-*" -and $_.metadata.name -ne "ns-admin" }

foreach ($item in $items) {
	$name = $item.metadata.name
	kubectl.exe delete ns $name
}
