# Vuepress Code Copy Plugin

A plugin for Vuepress that appends a copy button to every instance of a given selector (defaults to `div[class*="language-"] pre`)

## Installation

```
$ npm install vuepress-plugin-code-copy
# OR
$ yarn add vuepress-plugin-code-copy
```

## Usage

The plugin can be added to `.vuepress/config.js` in your Vuepress project under `plugins`:

```javascript
module.exports = {
    plugins: [['vuepress-plugin-code-copy', true]]
}
```

## Options

The plugin takes a number of options, which can be passed in with the plugin config in an options object:

```
module.exports = {
  plugins: [
    ["vuepress-plugin-code-copy", {
        selector: String,
        align: String,
        color: String,
        backgroundTransition: Boolean,
        backgroundColor: String,
        successText: String
  ]
}
```

### selector

-   Type: `String`
-   Default: `div[class*="language-"] pre`

This is the **CSS** [selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) to which the copy button component will be attached.

### align

-   Type: `String`
-   Default: `bottom`
-   Supported options: `top` and `bottom`

This option describes the vertical position of the copy button component as well as the `successText`

### color

-   Type: `String`
-   Default: `#27b1ff`

This sets the color of the copy button and can take any [hex code](https://htmlcolorcodes.com/).

### backgroundTransition

-   Type: `Boolean`
-   Default: `true`

Enables the background transition animation of the attached code block when a user presses the copy button.

### backgroundColor

-   Type: `String`
-   Default: `#0075b8`

This sets the color of the background transition animation and can take any [hex code](https://htmlcolorcodes.com/).

### successText

-   Type: `String`
-   Default: `Copied!`

This sets the text that displays when a user presses the copy button.
