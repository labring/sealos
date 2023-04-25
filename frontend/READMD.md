# sealos frontend

## prepare auto script
```bash
cd /sealos # Make sure you are in the sealos root directory
sh frontend/scripts/initFormat.sh
```

## prepare dev host
```bash
# io
echo '35.240.227.100 apiserver.cluster.local' | sudo tee -a /etc/hosts
# cn
echo '121.41.82.246 apiserver.cluster.local' | sudo tee -a /etc/hosts
```