import CodeCopy from './CodeCopy.vue'
import Vue from 'vue'
import './style.css'

export default {
    updated() {
        this.update()
    },
    methods: {
        update() {
            setTimeout(() => {
                document.querySelectorAll(selector).forEach(el => {
                    if (el.classList.contains('code-copy-added')) return
                    let ComponentClass = Vue.extend(CodeCopy)
                    let instance = new ComponentClass()

                    let options = {
                        align: align,
                        color: color,
                        backgroundTransition: backgroundTransition,
                        backgroundColor: backgroundColor,
                        successText: successText
                    }
                    instance.options = { ...options }
                    instance.code = el.innerText
                    instance.parent = el
                    instance.$mount()
                    el.classList.add('code-copy-added')
                    el.appendChild(instance.$el)
                })
            }, 100)
        }
    }
}
