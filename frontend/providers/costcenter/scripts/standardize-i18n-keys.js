const fs = require('fs')
const path = require('path')

// 指定要搜索 JSON 文件的文件夹
const i18nDirectory = path.join(__dirname, '../public/locales')

// 指定要进行全局替换的文件夹
const directories = ['../src'].map(dir => path.join(__dirname, dir))

// 存储所有需要替换的键值对
let replacements = {}

// 递归读取目录中的 JSON 文件并提取键名
const readI18nDirectory = (dirPath) => {
  console.log('Processing directory:', dirPath)
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject('Unable to scan directory: ' + err)
      }

      const promises = files.map((file) => {
        const filePath = path.join(dirPath, file)
        return new Promise((resolve, reject) => {
          fs.stat(filePath, (err, stats) => {
            if (err) {
              return reject(err)
            }

            if (stats.isDirectory()) {
              // 如果是目录，则递归调用
              readI18nDirectory(filePath).then(resolve).catch(reject)
            } else if (stats.isFile() && path.extname(file) === '.json') {
              // 如果是 JSON 文件，则读取和处理
              fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                  return reject(err)
                }

                // 解析 JSON 数据
                let jsonData
                try {
                  jsonData = JSON.parse(data)
                } catch (e) {
                  console.log(`Error parsing JSON in file ${filePath}: `, e)
                  return resolve()
                }

                // 创建一个新的对象来存储修改后的键
                let newJsonData = {}
                for (let key in jsonData) {
                  if (jsonData.hasOwnProperty(key)) {
                    // 将空格替换为下划线，并将所有字符变为小写
                    const newKey = key.replace(/ /g, '_').toLowerCase()
                    if (key !== newKey) {
                      replacements[key] = newKey // 记录键值对
                    }
                    newJsonData[newKey] = jsonData[key] // 修改 JSON 文件中的键名
                  } else {
                    newJsonData[key] = jsonData[key] // 保留不需要修改的键
                  }
                }

                // 将新对象转换回 JSON 字符串
                const result = JSON.stringify(newJsonData, null, 2)

                // 将修改后的 JSON 写回文件
                fs.writeFile(filePath, result, 'utf8', (err) => {
                  if (err) return reject(err)
                  console.log(`Updated ${filePath}`)
                  resolve()
                })
              })

            } else {
              resolve()
            }
          })
        })
      })

      Promise.all(promises).then(resolve).catch(reject)
    })
  })
}

// 递归读取目录中的文件并进行替换
const replaceInFiles = (dirPath) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject('Unable to scan directory: ' + err)
      }

      const promises = files.map((file) => {
        const filePath = path.join(dirPath, file)
        return new Promise((resolve, reject) => {
          fs.stat(filePath, (err, stats) => {
            if (err) {
              return reject(err)
            }

            if (stats.isDirectory()) {
              // 排除 node_modules 和 .next 目录
              if (['node_modules', '.next'].includes(file)) {
                console.log(`Skipping directory ${filePath}`)
                return resolve()
              }
              // 如果是目录，则递归调用
              replaceInFiles(filePath).then(resolve).catch(reject)
            } else if (stats.isFile() && ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(file))) {
              // 读取文件内容
              fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                  return reject(err)
                }

                // 按键名长度从长到短排序
                const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length)

                // 进行全局替换
                let result = data
                let hasChanges = false
                for (let key of sortedKeys) {
                  const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
                  if (regex.test(data)) {
                    console.log(`Replacing "${key}" with "${replacements[key]}" in ${filePath}`)
                    result = result.replace(regex, replacements[key])
                    hasChanges = true
                  }
                }

                // 如果有修改，将修改后的内容写回文件
                if (hasChanges) {
                  fs.writeFile(filePath, result, 'utf8', (err) => {
                    if (err) return reject(err)
                    console.log(`Updated ${filePath}`)
                    resolve()
                  })
                } else {
                  resolve()
                }
              })
            } else {
              resolve()
            }
          })
        })
      })

      Promise.all(promises).then(resolve).catch(reject)
    })
  })
}

// 读取 i18n 目录中的 JSON 文件并提取键名
readI18nDirectory(i18nDirectory)
  .then(() => {
    console.log('Replacements:', replacements)

    // 将 replacements 对象按键名长度从长到短排序
    const sortedReplacements = Object.fromEntries(
      Object.entries(replacements).sort(([keyA], [keyB]) => keyB.length - keyA.length)
    )

    // 将 replacements 对象写入新的 JSON 文件
    const replacementsFilePath = path.join(__dirname, 'replacements.json')
    fs.writeFile(replacementsFilePath, JSON.stringify(sortedReplacements, null, 2), 'utf8', (err) => {
      if (err) {
        return console.error('Error writing replacements file:', err)
      }
      console.log(`Replacements saved to ${replacementsFilePath}`)
    })

    // 遍历所有指定的目录进行替换
    return Promise.all(directories.map(replaceInFiles))
  })
  .then(() => {
    console.log('All replacements done.')
  })
  .catch((err) => {
    console.error(err)
  })
