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
          // path: "../5.0/docs",
          // sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: ({ versionDocsDirPath, docPath, locale }) =>
            "https://github.com/labring/sealos/tree/main/docs/5.0/" +
            (locale === "en" ? `${versionDocsDirPath}` : `i18n/${locale}`) +
            `/${docPath}`,
          editLocalizedFiles: false,
          editCurrentVersion: false,
          // version
          includeCurrentVersion: false,
          lastVersion: '4.0.0',
          versions: {
            '4.0.0': {
              label: '4.0.0',
              path: '',
              banner: 'none'
            },
            '5.0.0': {
              label: '5.0.0',
              path: '5.0.0',
              banner: 'none',
            }
          }
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
    ...(isDomesticSite ? {} : {
      announcementBar: {
        id: 'sealos_tip',
        content: `
        <div class="sealos-banner-box">
          <div>如果您是国内用户，请直接访问 👉 </div>
          <div class="sealos-banner-btn" onclick="window.open('https://sealos.run', '_blank');">
            国内官网
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
      }
    }),
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
          to: "https://blog.sealos.run/blog",
          label: "Blog"
        },
        {
          position: "left",
          to: "https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad",
          label: "Contact",
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
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
              label: "Devbox",
              to: "/devbox",
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
      async: false
    },
    {
      src: "/global.js",
      async: true
    }
  ],
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'baidu-site-verification',
        content: 'codeva-IaVFkVUuDD',
      },
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
    function gtmPlugin (context, options) {
      return {
        name: 'docusaurus-gtm-plugin',
        injectHtmlTags () {
          return {
            headTags: [
              {
                tagName: 'script',
                innerHTML: `
                  (function() {
                    const hostname = window.location.hostname;
                    if (hostname !== 'sealos.run') {
                      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                      })(window,document,'script','dataLayer','GTM-5953N4CP');
                    }
                  })();
                `,
              },
              {
                tagName: 'script',
                innerHTML: `
                    (function (w, d, s, l, i) {
                      w[l] = w[l] || []
                      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
                      var f = d.getElementsByTagName(s)[0],
                        j = d.createElement(s),
                        dl = l != 'dataLayer' ? '&l=' + l : ''
                      j.async = true
                      j.src = 'https://www.googletagmanager.com/gtag/js?id=' + i + dl
                      f.parentNode.insertBefore(j, f)

                      // Initialize dataLayer and gtag function
                      window.dataLayer = window.dataLayer || []
                      function gtag () { dataLayer.push(arguments) }
                      gtag('js', new Date())
                      gtag('config', 'G-YF5VHZSTE0')
                    })(window, document, 'script', 'dataLayer', 'G-YF5VHZSTE0')
                `,
              }
            ],
            preBodyTags: [
              {
                tagName: 'script',
                innerHTML: `
                  if (window.location.hostname !== 'sealos.run') {
                    document.write('<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5953N4CP" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>');
                  }
                `,
              },
            ]
          }
        },
      }
    },
    function umamiPlugin (context, options) {
      return {
        name: 'docusaurus-umami-plugin',
        injectHtmlTags () {
          return {
            headTags: [
              {
                tagName: 'script',
                innerHTML: `
                  (function() {
                    const hostname = window.location.hostname;
                    if (hostname === 'sealos.run') {
                      const script1 = document.createElement('script');
                      script1.src = 'https://umami.cloud.sealos.io/oishii';
                      script1.setAttribute('data-website-id', 'e5a8009f-7cb6-4841-9522-d23b96216b7a');
                      script1.async = true;
                      document.head.appendChild(script1);
                    } else {
                      const script2 = document.createElement('script');
                      script2.src = 'https://umami.cloud.sealos.io/oishii';
                      script2.setAttribute('data-website-id', 'a1c29ace-b288-431a-a2eb-8617d1d5b5ed');
                      script2.async = true;
                      document.head.appendChild(script2);
                    }
                  })();
                `,
              },
            ],
          }
        },
      }
    },
    function baiduPlugin (context, options) {
      return {
        name: 'docusaurus-baidu-plugin',
        injectHtmlTags () {
          return {
            headTags: [
              {
                tagName: 'script',
                innerHTML: `
                  (function() {
                    const hostname = window.location.hostname;
                    if (hostname === 'sealos.run') {
                      var _hmt = _hmt || [];
                      var hm = document.createElement("script");
                      hm.src = "https://hm.baidu.com/hm.js?d8e8ecf669c47dc2512d3f1417e761f9";
                      hm.async = true;
                      var s = document.getElementsByTagName("script")[0]; 
                      s.parentNode.insertBefore(hm, s);
                    }
                  })();
                `,
              },
            ],
          }
        },
      }
    }
  ]
}

module.exports = config