module.exports = {
  "presets": [require.resolve('@docusaurus/core/lib/babel/preset')],
  "plugins": [
    [
      "prismjs",
      {
        "languages": ["bash", "shell"],
        "plugins": ["line-numbers", "show-language"],
        "theme": "solarizedlight",
        "css": false
      }
    ]
  ]
};
