require('dotenv').config()

const generateAlgoliKey = () => "ce5b8e1e4d0d35ff587caf75ac404df4"
const isDomesticSite = process.env.SEALOS_LANG === "zh-Hans"

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Sealos: 专为云原生开发打造的以 K8s 为内核的云操作系统",
  tagline: "Kubernetes-kernel-based cloud os! Let's sealos run kubernetes",
  url: process.env.SEALOS_LANG === "zh-Hans" ? "https://sealos.run/" : "https://sealos.io/",
  baseUrl: "/",
  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "labring", // Usually your GitHub org/user name.
  projectName: "sealos", // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: process.env.SEALOS_LANG || 'en',
    locales: ["en", "zh-Hans"],
    // path: "../4.0/i18n"
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: "../4.0/docs",
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: ({ versionDocsDirPath, docPath, locale }) =>
            "https://github.com/labring/sealos/tree/main/docs/4.0/" +
            (locale === "en" ? `${versionDocsDirPath}` : `i18n/${locale}`) +
            `/${docPath}`,
          editLocalizedFiles: false,
          editCurrentVersion: false,
        },
        blog: {
          path: "../blog/en",
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/labring/sealos/tree/main/docs",
          editLocalizedFiles: true,
        },
        theme: {
          customCss: require.resolve("./src/css/custom.scss"),
        }
      }),
    ],
  ],

  themeConfig: { // @type {import('@docusaurus/preset-classic').ThemeConfig}
    metadata: [{ name: 'title', content: 'Sealos by 环界云' }],
    announcementBar: {
      id: 'sealos_tip',
      content: `
      <div class="sealos-banner-box">
        <div>${isDomesticSite ? 'If you are an international user, please visit 👉' : '如果您是国内用户，请直接访问 👉 '}</div>
        <div class="sealos-banner-btn" onclick="window.open('${isDomesticSite ? 'https://sealos.io' : 'https://sealos.run'}', '_blank');">
          ${isDomesticSite ? 'International Site' : '国内官网'}
        </div>
        <svg 
          onclick="handleBannerClose()"
          width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_1145_366)">
            <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22Z" fill="white" fill-opacity="0.16"/>
            <path d="M12 21.75C6.61507 21.75 2.25 17.3849 2.25 12C2.25 6.61507 6.61507 2.25 12 2.25C17.3849 2.25 21.75 6.61507 21.75 12C21.75 17.3849 17.3849 21.75 12 21.75Z" stroke="white" stroke-opacity="0.1" stroke-width="0.5"/>
            <path d="M9.17184 7.75696L11.9998 10.586L14.8278 7.75696L16.2428 9.17196L13.4138 12L16.2428 14.828L14.8278 16.243L11.9998 13.414L9.17184 16.243L7.75684 14.828L10.5858 12L7.75684 9.17196L9.17184 7.75696Z" fill="white"/>
          </g>
          <defs>
            <clipPath id="clip0_1145_366">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      </div>
      `,
      isCloseable: true,
    },
    algolia: {
      // Algolia 提供的应用 ID
      appId: "SLTSB7B9Y0",

      //  公开 API 密钥：提交它没有危险
      apiKey: generateAlgoliKey(),

      indexName: "sealosdocs",

      // 可选：见下文
      contextualSearch: true,

      // 可选：声明哪些域名需要用 window.location 型的导航而不是 history.push。 适用于 Algolia 配置会爬取多个文档站点，而我们想要用 window.location.href 在它们之间跳转时。
      externalUrlRegex: "sealos.io|docs.sealos.io|sealos.run",

      // 可选：Algolia 搜索参数
      searchParameters: {},

      // 可选：搜索页面的路径，默认启用（可以用 `false` 禁用）
      searchPagePath: "search",

      // ……其他 Algolia 参数
    },
    navbar: {
      title: "",
      logo: {
        alt: "sealos",
        src: "img/sealos-left.png",
        srcDark: "img/sealos-left-dark.png",
      },
      items: [
        {
          type: "doc",
          docId: "Intro",
          position: "left",
          label: "Docs",
          to: "/docs/Intro"
        },
        {
          position: "left",
          to: "https://cloud.sealos.io",
          label: "Start Now"
        },
        {
          position: "left",
          to: "/self-hosting",
          label: "Hosting"
        },
        {
          position: "left",
          to: "/blog",
          label: "Blog"
        },
        {
          position: "left",
          to: "https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad",
          label: "Contact",
        },
        {
          type: "localeDropdown",
          position: "right",
        },
        {
          href: "https://github.com/labring/sealos",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Product",
          items: [
            {
              label: "Laf",
              to: "https://github.com/labring/laf",
            },
            {
              label: "Sealfs",
              to: "https://github.com/labring/sealfs",
            },
            {
              label: "FastGPT",
              to: "https://github.com/labring/FastGPT",
            }
          ]
        },
        {
          title: "Developer",
          items: [
            {
              label: "Contribute",
              to: "https://github.com/labring/sealos/blob/main/CONTRIBUTING.md",
            }, {

              label: "Documentation",
              to: '/docs/Intro'
            }
          ]
        },
        {
          title: "Support",
          items: [
            {
              label: "Forum",
              to: "https://forum.laf.run/",
            },
            {
              label: "Feedback",
              to: "https://github.com/labring/sealos/issues",
            },
            {
              label: "Company",
              to: "/company",
            },
            {
              label: "Contact US",
              to: "https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad",
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} sealos. Built with Docusaurus2.`,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    prism: {
      additionalLanguages: ["docker"],
      theme: require("prism-react-renderer/themes/github"),
      darkTheme: require("./src/theme/dracula"),
    }
  },
  scripts: [
    {
      src: "/wow.min.js",
      async: true
    },
    {
      src: "/global.js",
      async: true
    },
    ...(isDomesticSite ? [{
      src: 'https://hm.baidu.com/hm.js?d8e8ecf669c47dc2512d3f1417e761f9',
      async: true,
    }] : [])
  ],
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'baidu-site-verification',
        content: 'codeva-IaVFkVUuDD',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: '高效管理你的云原生应用程序，像使用个人电脑一样在 Kubernetes 上一键安装编程语言、低代码开发平台、WordPress、数据库、AI 软件和 IM 软件。',
      }
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'Sealos, K8s, 云操作系统, 低代码开发平台, 数据库',
      }
    }
  ],
  plugins: [
    'docusaurus-plugin-sass',
    async function myPlugin (context, options) {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss (postcssOptions) {
          // Appends TailwindCSS and AutoPrefixer.
          postcssOptions.plugins.push(require("tailwindcss"))
          postcssOptions.plugins.push(require("autoprefixer"))
          return postcssOptions
        },
      }
    },
  ]
}

module.exports = config
