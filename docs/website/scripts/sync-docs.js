// scripts/sync-docs.js
const fs = require('fs-extra')
const path = require('path')

const versions = ['5.0.0', '4.0.0']
const websiteDir = path.resolve(__dirname, '..')
const rootDir = path.resolve(websiteDir, '..')

async function generateVersionsJson () {
  const versionsJsonPath = path.join(websiteDir, 'versions.json')
  await fs.writeJson(versionsJsonPath, versions, { spaces: 2 })
  console.log(`versions.json 文件已生成在 ${versionsJsonPath}`)
}

async function syncDocs () {
  try {
    // 删除指定的目录
    await fs.remove(path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-blog'))
    await fs.remove(path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-docs'))
    await fs.remove(path.join(websiteDir, 'versioned_docs'))
    await fs.remove(path.join(websiteDir, 'versioned_sidebars'))

    console.log('指定目录已删除')

    for (const version of versions) {
      const shortVersion = version.slice(0, 3) // 4.0.0 -> 4.0

      // 同步英文文档
      const enSourceDir = path.join(rootDir, shortVersion, 'docs')
      const enDestDir = path.join(websiteDir, 'versioned_docs', `version-${version}`)
      await fs.copy(enSourceDir, enDestDir)
      console.log(`英文文档已同步到 ${enDestDir}`)

      // 同步中文文档
      const zhSourceDir = path.join(rootDir, shortVersion, 'i18n', 'zh-Hans')
      const zhDestDir = path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-docs', `version-${version}`)
      await fs.copy(zhSourceDir, zhDestDir)
      console.log(`中文文档已同步到 ${zhDestDir}`)

      // 复制 code.json 文件
      const codeJsonSource = path.join(rootDir, shortVersion, 'code.json')
      const codeJsonDest = path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-docs', `version-${version}`, 'code.json')
      await fs.copy(codeJsonSource, codeJsonDest)
      console.log(`code.json 已复制到 ${codeJsonDest}`)


      // 复制 sidebar 文件
      const sidebarSource = path.join(rootDir, shortVersion, 'sidebar.json')
      const sidebarDest = path.join(websiteDir, 'versioned_sidebars', `version-${version}-sidebars.json`)
      if (await fs.pathExists(sidebarSource)) {
        await fs.copy(sidebarSource, sidebarDest)
        console.log(`sidebar.json 已复制到 ${sidebarDest}`)
      }

      const sidebarSourceZh = path.join(rootDir, shortVersion, 'i18n', 'zh-Hans', 'sidebar.json')
      const sidebarDestZh = path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-docs', `version-${version}.json`)
      if (await fs.pathExists(sidebarSourceZh)) {
        await fs.copy(sidebarSourceZh, sidebarDestZh)
        console.log(`zh sidebar.json 已复制到 ${sidebarDestZh}`)
      }

    }

    // 同步博客内容
    const blogSourceDir = path.join(rootDir, 'blog/zh-Hans')
    const blogDestDir = path.join(websiteDir, 'i18n/zh-Hans/docusaurus-plugin-content-blog')
    await fs.copy(blogSourceDir, blogDestDir)
    console.log(`博客内容已同步到 ${blogDestDir}`)

    // 生成 versions.json 文件
    await generateVersionsJson()
    console.log('所有文档同步完成')

  } catch (err) {
    console.error('同步过程中发生错误:', err)
  }
}

syncDocs()