<template>
    <div class="code-copy">
        <svg
            @click="copyToClipboard"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            :style="alignStyle"
        >
            <path fill="none" d="M0 0h24v24H0z" />
            <path
                :fill="options.color"
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4l6 6v10c0 1.1-.9 2-2 2H7.99C6.89 23 6 22.1 6 21l.01-14c0-1.1.89-2 1.99-2h7zm-1 7h5.5L14 6.5V12z"
            />
        </svg>
        <span :class="success ? 'success' : ''" :style="alignStyle">{{ options.successText }}</span>
    </div>
</template>

<script>
export default {
    props: {
        parent: Object,
        code: String,
        options: {
            align: String,
            color: String,
            backgroundTransition: Boolean,
            backgroundColor: String,
            successText: String
        }
    },
    data() {
        return {
            success: false,
            originalBackground: null,
            originalTransition: null
        }
    },
    computed: {
        alignStyle() {
            let style = {}
            style[this.options.align] = '7.5px'
            return style
        }
    },
    methods: {
        // From: https://stackoverflow.com/a/5624139
        hexToRgb(hex) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
            return result
                ? {
                      r: parseInt(result[1], 16),
                      g: parseInt(result[2], 16),
                      b: parseInt(result[3], 16)
                  }
                : null
        },
        copyToClipboard(el) {
            navigator.clipboard
                .writeText(this.code)
                .then(
                    () => {
                        clearTimeout(this.successTimeout)

                        this.originalBackground = this.originalBackground
                            ? this.originalBackground
                            : this.parent.style.background
                        this.originalTransition = this.originalTransition
                            ? this.originalTransition
                            : this.parent.style.transition

                        if (this.options.backgroundTransition) {
                            this.parent.style.transition = 'background 350ms'

                            let color = this.hexToRgb(
                                this.options.backgroundColor
                            )
                            this.parent.style.background = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`
                        }

                        this.success = true
                        this.successTimeout = setTimeout(() => {
                            if (this.options.backgroundTransition) {
                                this.parent.style.background = this.originalBackground
                            }
                            this.success = false
                        }, 500)
                    },
                    () => {}
                )
        },
        beforeDestroy() {
            this.parent.style.transition = this.originalTransition
            this.parent.style.background = this.originalBackground
        }
    }
}
</script>

<style scoped>
.code-copy {
    opacity: 0;
}

svg {
    position: absolute;
    right: 7.5px;
    opacity: 0.45;
    cursor: pointer;
}

svg:hover {
    opacity: 1;
}

span {
    position: absolute;
    font-size: 0.85rem;
    right: 50px;
    opacity: 0;
    transition: opacity 500ms;
}

.success {
    opacity: 1;
}
</style>
