# Fork
Fork sealos to your repository. `https://github.com/<your-username>/sealos`
# Clone
Clone `https://github.com/<your-username>/sealos` your own repository to develop locally.
# Set remote upstream
```
git remote add upstream https://github.com/fanux/sealos.git
git remote set-url --push upstream no-pushing
```
# Fetch from upstream
Merge fanux/sealos to `<your-username>/sealos`
```
git pull upstream master
git push
```

Merge `<your-username>/sealos` to fanux/sealos just using github Pull requests.

# Workflow
```
                         Pull request
   upstream(fanux/sealos)<-------------------------origin(<you>/sealos)
         |                                        ^
         | pull upstream master            push   |
         +---------------------->localGit---------+
```
