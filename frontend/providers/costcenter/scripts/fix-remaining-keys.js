const fs = require('fs')
const path = require('path')

// 指定要搜索 JSON 文件的文件夹
const i18nDirectory = path.join(__dirname, '../public/locales')

// 递归读取目录中的 JSON 文件并修复剩余的键名
const fixRemainingKeys = (dirPath) => {
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
              fixRemainingKeys(filePath).then(resolve).catch(reject)
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

                // 递归修复嵌套对象中的键名
                const fixKeys = (obj) => {
                  if (typeof obj !== 'object' || obj === null) return obj
                  
                  const newObj = {}
                  for (let key in obj) {
                    if (obj.hasOwnProperty(key)) {
                      // 将空格替换为下划线，并将所有字符变为小写
                      const newKey = key.replace(/ /g, '_').toLowerCase()
                      newObj[newKey] = fixKeys(obj[key]) // 递归处理嵌套对象
                    }
                  }
                  return newObj
                }

                const fixedData = fixKeys(jsonData)

                // 将新对象转换回 JSON 字符串
                const result = JSON.stringify(fixedData, null, 2)

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

// 读取 i18n 目录中的 JSON 文件并修复键名
fixRemainingKeys(i18nDirectory)
  .then(() => {
    console.log('All remaining key fixes done.')
  })
  .catch((err) => {
    console.error(err)
  })
