// scripts/sync-docs.js
const fs = require('fs-extra')
const path = require('path')

const versions = ['5.0.0', '4.0.0']
const websiteDir = path.resolve(__dirname, '..')
const rootDir = path.resolve(websiteDir, '..')

async function generateVersionsJson () {
  const versionsJsonPath = path.join(websiteDir, 'versions.json')
  await fs.writeJson(versionsJsonPath, versions, { spaces: 2 })
}

function safeJoin (base, ...parts) {
  const joined = [base, ...parts].join(path.sep)
  const normalized = path.normalize(joined)

  const normalizedBase = path.normalize(base)
  if (!normalized.startsWith(normalizedBase) || normalized === normalizedBase) {
    throw new Error('Path traversal attempt blocked')
  }

  return normalized
}

async function syncDocs () {
  try {
    // Remove specified directories
    const dirsToRemove = [
      'i18n/zh-Hans/docusaurus-plugin-content-blog',
      'i18n/zh-Hans/docusaurus-plugin-content-docs',
      'versioned_docs',
      'versioned_sidebars'
    ].map(dir => safeJoin(websiteDir, dir))

    await Promise.all(dirsToRemove.map(dir => fs.remove(dir)))

    for (const version of versions) {
      const shortVersion = version.slice(0, 3)

      // Sync English docs
      await fs.copy(
        path.join(rootDir, shortVersion, 'docs'),
        path.join(websiteDir, 'versioned_docs', `version-${version}`)
      )

      // Sync Chinese docs
      await fs.copy(
        path.join(rootDir, shortVersion, 'i18n', 'zh-Hans'),
        path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-docs', `version-${version}`)
      )

      // Copy sidebar files
      const sidebarPaths = [
        {
          src: path.join(rootDir, shortVersion, 'sidebar.json'),
          dest: path.join(websiteDir, 'versioned_sidebars', `version-${version}-sidebars.json`)
        },
        {
          src: path.join(rootDir, shortVersion, 'i18n', 'zh-Hans', 'sidebar.json'),
          dest: path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-docs', `version-${version}.json`)
        }
      ]

      for (const { src, dest } of sidebarPaths) {
        if (await fs.pathExists(src)) {
          await fs.copy(src, dest)
        }
      }
    }

    // Sync code.json
    await fs.copy(
      path.join(rootDir, '5.0/code.json'),
      path.join(websiteDir, 'i18n/zh-Hans/code.json')
    )

    // Sync blog content
    await fs.copy(
      path.join(rootDir, 'blog/zh-Hans'),
      path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-blog')
    )

    await generateVersionsJson()
    console.log(`All documents synchronized successfully:
    - Synced docs for versions: ${versions.join(', ')}
    - Updated English and Chinese documentation
    - Copied code.json and sidebar files
    - Synced blog content
    - Generated versions.json`)

  } catch (err) {
    console.error('Error during synchronization:', err)
  }
}

syncDocs()