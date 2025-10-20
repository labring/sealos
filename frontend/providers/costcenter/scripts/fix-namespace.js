const fs = require('fs')
const path = require('path')

// 指定要进行全局替换的文件夹
const directories = ['../src'].map(dir => path.join(__dirname, dir))

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

                // 进行全局替换：将 t('key') 替换为 t('common:key')
                let result = data
                let hasChanges = false
                
                // 更精确的正则表达式，只匹配翻译键，不匹配路径等
                const regex = /t\(['"]([a-zA-Z_][a-zA-Z0-9_.]*[a-zA-Z0-9_])['"]\)/g
                const matches = [...data.matchAll(regex)]
                
                for (const match of matches) {
                  const originalMatch = match[0]
                  const key = match[1]
                  
                  // 如果 key 不包含冒号，说明还没有 namespace
                  if (!key.includes(':')) {
                    const newMatch = `t('common:${key}')`
                    console.log(`Replacing "${originalMatch}" with "${newMatch}" in ${filePath}`)
                    result = result.replace(originalMatch, newMatch)
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

// 遍历所有指定的目录进行替换
Promise.all(directories.map(replaceInFiles))
  .then(() => {
    console.log('All namespace updates done.')
  })
  .catch((err) => {
    console.error(err)
  })
