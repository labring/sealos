<div align="center">

  <a href="https://sealos.io" target="_blank" rel="noopener">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./docs/img/sealos-left-dark.png" />
      <source media="(prefers-color-scheme: light)" srcset="./docs/img/sealos-left.png" />
      <img src="./docs/img/sealos-left.png" />
    </picture>
  </a>

# 🚀 開発、デプロイ、スケーリングをひとつのシームレスなクラウドプラットフォームで ☁️

Sealos['siːləs'] は、Kubernetes上に構築されたAIネイティブなクラウドオペレーティングシステムです。クラウドIDEでの開発から本番環境へのデプロイ・管理まで、アプリケーションのライフサイクル全体を統合します。最新のAIアプリケーション、SaaSプラットフォーム、マネージドデータベース（MySQL、PostgreSQL、Redis、MongoDB）、複雑なマイクロサービスアーキテクチャの構築とスケーリングに最適です。

</div>

<div align="center">

[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/github/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![](https://img.shields.io/docker/pulls/labring/kubernetes)](https://hub.docker.com/r/labring/kubernetes)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealos.io)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/repo/labring/sealos?ref=badge_small)

<a href="https://runacap.com/ross-index/annual-2023/" target="_blank" rel="noopener">
    <img
        style="width: 260px; height: 56px margin-top: 50px"
        src="https://runacap.com/wp-content/uploads/2024/03/Annual_ROSS_badge_black_2023.svg"
        alt="ROSS Index - 最も急成長しているオープンソーススタートアップ | Runa Capital"
        width="260"
        height="56"
    />
</a>

</div>

<hr />

<div align="center">
 <a href="https://sealos.io">ウェブサイト</a> •
  <a href="https://sealos.io/docs">ドキュメント</a> •
  <a href="https://discord.gg/wdUn538zVP">Discord</a> •
  <a href="https://twitter.com/Sealos_io">Twitter</a> •
  <a href="./README.md">English</a> •
  <a href="./README_zh.md">简体中文</a>
</div>

<br />

<div align="center">

[![Deploy on Sealos][deploy-badge]][deploy-link]

https://github.com/user-attachments/assets/cc8599da-6c3e-4503-bb53-55e13bf61ef6

<img width="916" alt="image" src="https://github.com/labring/sealos/assets/8912557/9e8c1d76-718e-4910-a9ab-94f220a61a9c">

</div>

## はじめに

### Sealosでワンクリックで開発環境を構築

1. Sealos Devboxを開きます。

 <img width="914" height="331" alt="image" src="https://github.com/user-attachments/assets/cbc2982b-d40a-458b-9c07-078bd9e36a3b" />

2. さまざまな言語やフレームワークから選択して、開発環境を作成します。

 <img width="1147" alt="image" src="https://github.com/user-attachments/assets/6075bbb0-4765-4786-9154-3adaa139900c">

3. VSCodeやCursorなどのIDEから環境にアクセスします。

    <img width="864" alt="image" src="https://github.com/user-attachments/assets/e5f9dcdc-5149-4e43-aa13-6c17507fbe9f">

    <img width="1024" alt="image" src="https://github.com/user-attachments/assets/9a985280-6ff2-48dc-83b9-9abd8f93af17">

### Sealosでデータベースを作成

1. Sealos データベースを開きます。

 <img width="824" height="256" alt="image" src="https://github.com/user-attachments/assets/4f28b15f-c453-4110-93ae-ce0e72caea48" />

2. データベースを作成します。

 <img width="874" alt="image" src="https://github.com/user-attachments/assets/4cc88a54-70e6-458f-9766-4578774e7f81">

3. データベースの詳細とアクセス情報を確認します。

 <img width="1430" alt="image" src="https://github.com/user-attachments/assets/bcf54218-f4f4-4c89-a107-0bbde6f92d67">

### SealosでDockerイメージをデプロイ

1. Sealos App Launchpadを開きます。

 <img width="885" height="191" alt="image" src="https://github.com/user-attachments/assets/3134922a-75b4-4c3b-a3e4-6c402f171dff" />

2. Kubernetes Deploymentを使用してDockerイメージをデプロイし、Ingressで公開します。

 <img width="971" alt="image" src="https://github.com/user-attachments/assets/a291571f-d9fe-42e5-812e-3d8f274a97ca">

3. アプリの詳細を確認し、サービスにアクセスします。

 <img width="1016" alt="image" src="https://github.com/user-attachments/assets/a54884cf-a1e8-4178-88af-655234ec7eef">

## 💡 主な機能

- 統合クラウドIDE: セットアップ不要で、クラウド上での共同開発が可能です。DevBoxにより、ローカル環境の不整合を解消します。
- マネージドデータベースとストレージ: 本番環境対応のPostgreSQL、MySQL、MongoDB、Redis、および組み込みのS3互換オブジェクトストレージを提供します。
- 充実のアプリストア: ワンクリックで複雑なアプリケーションをデプロイ。YAML設定やコンテナオーケストレーションの複雑さは不要です。
- Kubernetesのフルパワー: 複雑さなしにKubernetesの全機能を活用できます。初日からK8sネイティブです。
- エンタープライズマルチテナンシー: ワークスペースベースの分離、きめ細かなRBAC、ワークスペースごとのリソースクォータで安全なコラボレーションを実現します。
- AIネイティブインフラストラクチャ: 説明するだけでAIを活用してあらゆるものを構築・スケーリングできます。

## 🏘️ コミュニティとサポート

- 🌐 完全なドキュメントと便利なリンクについては、[Sealos ウェブサイト](https://sealos.io/)をご覧ください。
- 💬 [Discord サーバー](https://discord.gg/wdUn538zVP)に参加して、Sealosチームや他のSealosユーザーと交流しましょう。SealosやKubernetesについて学び、質問し、経験を共有する場です。
- 🐦 [X/Twitter](https://twitter.com/Sealos_io)で @Sealos_io をフォローしてください。
- 🐞 バグ報告や機能リクエストは[GitHub Issues](https://github.com/labring/sealos/issues/new/choose)で作成してください。

## 🚧 ロードマップ

Sealosは[公開ロードマップ](https://github.com/orgs/labring/projects/4/views/9)を管理しています。プロジェクトの主要な優先事項、各機能やプロジェクトの成熟度、プロジェクトの方向性への影響方法をハイレベルで確認できます。

## 👩‍💻 コントリビューションと開発

[既存のIssue](https://github.com/labring/sealos/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc)や[プルリクエスト](https://github.com/labring/sealos/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc)を確認して、貢献できるものを探してください。機能リクエストやバグ報告をしたい場合は、提供されているテンプレートを使用して[GitHub Issue を作成](https://github.com/labring/sealos/issues/new/choose)してください。

📖 [コントリビューションガイドを見る →](./CONTRIBUTING.md)

🔧 [開発ガイドを見る →](./DEVELOPGUIDE.md)

## リンク

- [FastGPT](https://github.com/labring/FastGPT) は、無料でオープンソースの強力なAIナレッジベースプラットフォームです。すぐに使えるデータ処理、モデル呼び出し、RAG検索、ビジュアルAIワークフローを提供します。複雑なLLMアプリケーションを簡単に構築できます。
- [Buildah](https://github.com/containers/buildah) Buildahの機能は、Sealos 4.0でクラスターイメージがOCI標準に準拠することを保証するために広く活用されています。

[deploy-badge]: https://sealos.io/Deploy-on-Sealos.svg
[deploy-link]: https://os.sealos.io

## 📄 ライセンス

Sealosは[Sealos Sustainable Use License](./LICENSE.md)の下でライセンスされています。このカスタムライセンスでは以下が許可されています：

- ✅ 社内業務利用および個人の非商用利用
- ❌ 第三者へのクラウドサービスの提供

**標準的なオープンソースライセンスではありません** - ご利用前に[ライセンス全文](./LICENSE.md)をご確認ください。

**コントリビューション**: コントリビューションにより、[コントリビューターライセンス契約](./CONTRIBUTOR_LICENSE_AGREEMENT.md)およびライセンス変更条件に同意したものとみなされます。

<!-- ## ライセンス -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
