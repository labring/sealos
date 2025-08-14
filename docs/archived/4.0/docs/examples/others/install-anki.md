# Quick Installation of a Custom Anki Sync Server

Anki is a spaced repetition flashcard program. Essentially, it is a card sorting tool that **actively tests users on custom card content, allows users to self-grade their responses, and then uses an algorithm to reschedule cards based on the judgments to optimize long-term retention**.

The so-called "cards" are technically called flash cards. They are small cards with a question or prompt on one side and the answer on the reverse side. You first read the question/prompt, try to recall the answer mentally, then flip the card to verify against the answer provided.

The core principle of flashcard creation is:**one knowledge point per card**. As such, Anki is well-suited for learning languages, memorizing historical dates, formulas, etc.

Anki's official sync server is hosted overseas and is a personal project with limited bandwidth. Syncing is very slow. To sync learning progress and new cards across multiple clients would be extremely painful.

To address this, we need to deploy a custom sync server and have the clients connect to it instead.

## Deploying an Anki Sync Server

Since the February 2023 release of Anki 2.1.57 for desktop, Anki on desktop, Android, and iOS now support custom sync servers without needing to install plugins. Anki users no longer need to worry about sync issues. The longstanding sync problem has finally been completely solved.

Currently, the only project that supports the latest Anki versions is [anki-sync-server-rs](https://github.com/ankicommunity/anki-sync-server-rs). Other sync server projects are now mostly obsolete. This Rust project tracks progress on Anki's official sync server and also uses sqlite as the backend data store.

Below we will deploy anki-sync-server-rs on Sealos and configure it.

First, enter the URL https://cloud.sealos.io/ in your browser to access the Sealos desktop. Then open "App Launchpad":

![](../images/2023-06-26-11-54-EIVahX.jpg)

Click "Create Application":

![](../images/2023-06-26-11-55-NDkuEg.jpg)

Enter the application name and image name. The exposed container port is `27701`. Enable external network access:

![](../images/2023-06-26-11-59-FxJE12.png)

Scroll down and expand "Advanced Configuration". Click "Edit Environment Variables":

![](../images/2023-06-26-12-01-DKect7.png)

Paste the following into the environment variable input box:

```
bash
Copy code

ANKISYNCD_USERNAME=<USERNAME>  
ANKISYNCD_PASSWORD=<PASSWD>
```

Replace `<USERNAME>` with your username and `<PASSWD>` with your password.

![](../images/2023-06-26-12-05-CWczxm.png)

Click "Add Storage Volume":

![](../images/2023-06-26-12-06-lvv6ms.png)

Set the mount path to `/app` and confirm:

![](../images/2023-06-26-12-07-s8W7iu.png)

Finally, click "Deploy Application" in the top right corner.

After deployment, click "Details" to enter the application details screen.

![](../images/2023-06-26-12-09-RslDGj.png)

Here you can see the instance status. Wait until the status shows as "running" before proceeding. If it stays pending for a while, click "Details" to check the failure reason:

![](../images/2023-06-26-13-09-Vs9ccy.png)

Once deployed successfully, you can monitor metrics like CPU and memory usage. Click the external URL to directly access the sync server's web interface.

![](../images/2023-06-26-13-09-YFHPYc.png)

If you see the following screen, the deployment succeeded:

![](../images/2023-06-26-13-09-FwsbfW.png)

Viewing logs is also straightforward - click the "three dots" on the instance panel and select "Logs":

![](../images/2023-06-26-13-09-hdHfxP.png)

![](../images/2023-06-26-13-09-nwrxrv.png)

## Client Configuration

### Desktop

To configure the desktop client (macOS/Windows/Linux):

1. Open "Preferences"

   ![](../images/2023-06-26-12-24-QHYKZt.png)

2. Click "Network" and look for the "self-hosted sync server" section. Enter your server's address:

   ![](../images/2023-06-26-12-26-HYOaBJ.png)

3. Restart Anki and click "Sync":

   ![](../images/2023-06-26-12-28-ccnUOj.png)

4. A prompt will appear asking for username and password. Enter what you configured earlier:

   ![](../images/2023-06-26-12-29-z5E9gi.png)

5. Click OK and syncing will begin.

### Android

On Android, directly configure via "Settings -> Advanced -> Custom sync server":

![](../images/2022-04-10-14-31-vrNHJU.png)

Also enter username and password:

> Settings -> Basic -> AnkiWeb Account

This completes the configuration. All card decks should sync over:

![](../images/2022-04-10-14-32-ADfk8T.png)
![](../images/2022-04-10-14-32-1iudM0.png)

The official app version is quite old. For the latest community version, download the Beta here:

- https://github.com/ankidroid/Anki-Android/releases

The **arm64-v8a** version is recommended.

After installing, the sync server can be configured under "Settings -> Sync -> Custom sync server":

![](../images/2023-06-26-12-39-1jsF0t.jpeg)

Also enter the username and password:

> Settings -> Sync -> AnkiWeb Account

### iOS

AnkiMobile also supports syncing with a custom server. At least version Ankimobile 2.0.90(20090.2) seems to work based on [reports in the Anki forums](https://forums.ankiweb.net/t/ankimobile-self-sync-server-failure-the-one-bundled-in-version-2-1-60-qt6/27862).

If you encounter sync issues after configuring, try toggling "Allow Anki to access local network" off and on in iOS settings per Anki's docs:

> If you're using AnkiMobile and are unable to connect to a server on your local network, please go into the iOS settings, locate Anki near the bottom, and toggle "Allow Anki to access local network" off and on again.

The tip above is excerpted from the [Anki tutorial](https://docs.ankiweb.net/sync-server.html#client-setup).