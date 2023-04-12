const bucket = new Set();

const data = { text: 'hello world' };
const btn = document.querySelector('#btn');

const obj = new Proxy(data, {
    get(target, key) {
        // 将副作用函数加入
        bucket.add(effect)
        return target[key];
    },
    set(target, key, newVal) {
        target[key] = newVal;
        bucket.forEach(fn => fn());
        return true
    }
})

effect()

function effect() {
    btn.innerText = obj.text
}

btn.addEventListener('click', (() => {
    obj.text = 'hello vue3'
}))
