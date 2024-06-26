## How to dev

1. First,you should refer to `frontend/README.md` ’s `How to dev` part.

2. Then you should config your env.

   1. Create a new file `.env.local` in frontend/providers/kubepanel directory.

   2. ```
      NEXT_PUBLIC_MOCK_USER=""
      SEALOS_DOMAIN="dev.sealos.top"
      NODE_ENV="development"
      ```

   3.  Then we should get our `NEXT_PUBLIC_MOCK_USER`

      1. go to `dev.sealos.top`  and login (firstly you goin this website,you are signuping,so go on.)

      2. Refer this picture,you should open `Console-application`，and get your own `session.state.session.kubeconfig`,copy as JSON string.

         ![image-20240423105724369](https://raw.githubusercontent.com/mlhiter/typora-images/master/202404231101028.png)

3. After that,have your own `test 3000 `page

   > Why you should have that?
   >
   > If you open your own dev in `localhost:3000` directly,you cannot have sealos desktop border,which maybe influence your style.

   1. This url：[website](https://cloud.sealos.run/?openapp=system-template%3FtemplateName%3Done-step-shortcuts)

   2. ![image-20240423111024336](https://raw.githubusercontent.com/mlhiter/typora-images/master/202404231110609.png)

   3. Refresh website.

   4. Then you can get your own dev in this.

      ![image-20240423111123308](https://raw.githubusercontent.com/mlhiter/typora-images/master/202404231111720.png)