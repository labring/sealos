const fs = require('fs');
const path = require('path');

// 排序函数
function sortJson(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => sortJson(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const sortedKeys = Object.keys(obj).sort((a, b) => {
      // 先比较是否为大写字母
      const isUpperA = a[0] >= 'A' && a[0] <= 'Z';
      const isUpperB = b[0] >= 'A' && b[0] <= 'Z';
      if (isUpperA && !isUpperB) return -1;
      if (!isUpperA && isUpperB) return 1;
      // 如果都是大写字母或都是小写字母，则按字典序比较
      return a.localeCompare(b);
    });
    const sortedObj = {};
    for (const key of sortedKeys) {
      sortedObj[key] = sortJson(obj[key]);
    }
    return sortedObj;
  } else {
    return obj;
  }
}

// 处理单个 JSON 文件
function processJsonFile(filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}:`, err);
      return;
    }

    try {
      const jsonData = JSON.parse(data);
      const sortedJsonData = sortJson(jsonData);
      const sortedJsonString = JSON.stringify(sortedJsonData, null, 4);

      console.log(`File ${filePath} has been processed and sorted.`);

    //   fs.writeFile(filePath, sortedJsonString, 'utf8', (writeErr) => {
    //     if (writeErr) {
    //       console.error(`Error writing file ${filePath}:`, writeErr);
    //     } else {
    //       console.log(`File ${filePath} has been processed and sorted.`);
    //     }
    //   });
    } catch (parseErr) {
      console.error(`Error parsing JSON in file ${filePath}:`, parseErr);
    }
  });
}

// 处理 ./providers/*/public/locales/(zh|en)/common.json
const providersBasePath = './providers';
fs.readdir(providersBasePath, { withFileTypes: true }, (err, dirs) => {
  if (err) {
    console.error(`Error reading directory ${providersBasePath}:`, err);
    return;
  }

  dirs.forEach((dir) => {
    if (dir.isDirectory()) {
      const localesPath = path.join(providersBasePath, dir.name, 'public', 'locales');
      fs.readdir(localesPath, { withFileTypes: true }, (localesErr, localesDirs) => {
        if (localesErr) {
          console.error(`Error reading directory ${localesPath}:`, localesErr);
          return;
        }

        localesDirs.forEach((localesDir) => {
          if (localesDir.isDirectory() && ['zh', 'en'].includes(localesDir.name)) {
            const commonJsonPath = path.join(localesPath, localesDir.name, 'common.json');
            fs.access(commonJsonPath, fs.constants.F_OK, (accessErr) => {
              if (accessErr) {
                console.log(`Skipping non-existent file: ${commonJsonPath}`);
                return;
              }
              processJsonFile(commonJsonPath);
            });
          }
        });
      });
    }
  });
});

// 处理 desktop/public/locales/(zh|en)/*.json
const desktopBasePath = './desktop/public/locales';
fs.readdir(desktopBasePath, { withFileTypes: true }, (err, dirs) => {
  if (err) {
    console.error(`Error reading directory ${desktopBasePath}:`, err);
    return;
  }

  dirs.forEach((dir) => {
    if (dir.isDirectory() && ['zh', 'en'].includes(dir.name)) {
      const dirPath = path.join(desktopBasePath, dir.name);
      fs.readdir(dirPath, { withFileTypes: true }, (filesErr, files) => {
        if (filesErr) {
          console.error(`Error reading directory ${dirPath}:`, filesErr);
          return;
        }

        files.forEach((file) => {
          if (file.isFile() && path.extname(file.name) === '.json') {
            const filePath = path.join(dirPath, file.name);
            fs.access(filePath, fs.constants.F_OK, (accessErr) => {
              if (accessErr) {
                console.log(`Skipping non-existent file: ${filePath}`);
                return;
              }
              processJsonFile(filePath);
            });
          }
        });
      });
    }
  });
});
