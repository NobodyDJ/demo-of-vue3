// demo2将effect函数更改为匿名函数，使其具有通用性
// 这里的demo本质反映的问题是当设置对象不存在的属性时，还是调用了副作用函数，这是错误，
// 正确的是针对一个具体的属性，应该调用其对应的属性
const bucket = new Set();

const data = { text: 'hello world' };
const btn = document.querySelector('#btn');
const fn = () => { count === 0 ? console.log('effect run') : console.log('Not exist attribute'); btn.innerText = obj.text };
let count = 0;
let activeEffect;

const obj = new Proxy(data, {
    get(target, key) {
        // 将副作用函数加入
        if (activeEffect) {
            bucket.add(activeEffect);
        }
        return target[key];
    },
    set(target, key, newVal) {
        target[key] = newVal;
        bucket.forEach(fn => fn());
        return true
    }
})

effect(fn)

function effect(fn) {
    activeEffect = fn;
    fn();
}

if (count === 0) {
    btn.addEventListener('click', (() => {
        obj.text = 'hello vue3';
        count++;
    }))
} else {
    btn.addEventListener('click', (() => {
        obj.notExist = 'no exist';
    }))
}


