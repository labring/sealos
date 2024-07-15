const fs = require('fs')
const path = require('path')

const directoryPath = path.join(__dirname, 'public/locales') // 指定要搜索的文件夹

// 递归读取目录中的文件
const readDirectory = (dirPath) => {
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      return console.log('Unable to scan directory: ' + err)
    }

    files.forEach((file) => {
      const filePath = path.join(dirPath, file)
      fs.stat(filePath, (err, stats) => {
        if (err) {
          return console.log(err)
        }

        if (stats.isDirectory()) {
          // 如果是目录，则递归调用
          readDirectory(filePath)
        } else if (stats.isFile() && path.extname(file) === '.json') {
          // 如果是 JSON 文件，则读取和处理
          fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
              return console.log(err)
            }

            // 解析 JSON 数据
            let jsonData
            try {
              jsonData = JSON.parse(data)
            } catch (e) {
              console.log(`Error parsing JSON in file ${filePath}: `, e)
              return
            }

            // 创建一个新的对象来存储修改后的键
            const newJsonData = {}
            for (let key in jsonData) {
              if (jsonData.hasOwnProperty(key)) {
                // 将空格替换为下划线，并将所有字符变为小写
                const newKey = key.replace(/ /g, '_').toLowerCase()
                newJsonData[newKey] = jsonData[key]
              }
            }

            // 将新对象转换回 JSON 字符串
            const result = JSON.stringify(newJsonData, null, 2)

            // 将修改后的 JSON 写回文件
            fs.writeFile(filePath, result, 'utf8', (err) => {
              if (err) return console.log(err)
              console.log(`Replaced in ${filePath}`)
            })
          })
        }
      })
    })
  })
}

// 开始读取目录
readDirectory(directoryPath)