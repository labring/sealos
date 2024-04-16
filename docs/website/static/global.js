document.addEventListener("DOMContentLoaded", function () {
  // console.log('Handle a tag interception', 111)
  const parentElement = document.body
  parentElement.addEventListener("click", function (event) {
    if (event.target.tagName === "A") {
      const href = event.target.getAttribute("href")
      const currentHostname = window.location.hostname
      const targetHostname = currentHostname === "sealos.io" ? 'sealos.io' : 'sealos.run'

      if (href.includes("sealos.io") || href.includes("sealos.top") || href.includes("sealos.run")) {
        event.preventDefault()

        // console.log("Before:" + href)
        const modifiedHref = href.replace(/(sealos\.io|sealos\.top|sealos\.run)/, targetHostname)
        // console.log("After:", modifiedHref)

        event.target.href = modifiedHref
        window.open(modifiedHref)
      }
    }
  })

  if (window.location.hostname === 'sealos.run') {
    const baiduSubmitUrl = 'https://htr4n1.laf.run/baidu-sealos?urls=https://sealos.run'
    fetch(baiduSubmitUrl)
      .then(response => response.json())
      .then(data => {
        const responseBody = JSON.parse(data.body)
        // console.log(responseBody)
      })
      .catch(error => {
        console.error('请求失败，但这可能是因为达到提交上限:', error)
      })
  }

})

function handleBannerClose () {
  const closeButton = document.querySelector('.clean-btn')
  // console.log(closeButton)
  if (closeButton) {
    closeButton.click()
  }
}