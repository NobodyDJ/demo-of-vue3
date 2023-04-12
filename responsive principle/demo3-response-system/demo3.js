// demo3针对demo2出现不存在的键进行赋值，依然会调用其他属性的effect函数
const bucket = new WeakMap();// 这里采用了weakMap弱键值对，体现在于垃圾回收机制

const data = { text: 'hello world' };
const btn = document.querySelector('#btn');
const fn = () => { count === 0 ? console.log('effect run') : console.log('Not exist attribute'); btn.innerText = obj.text };
let count = 0;
let activeEffect;

const obj = new Proxy(data, {
    get(target, key) {
        // 将副作用函数加入
        track(target, key)
        return target[key];
    },
    set(target, key, newVal) {
        target[key] = newVal;
        trigger(target, key);
    }
})

function track(target, key) {
    if (!activeEffect) return target[key];
    // 获取对象对应的键
    let depsMap = bucket.get(target);
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }
    deps.add(activeEffect);
}

function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    effects && effects.forEach((fn) => fn());
}

effect(fn)

function effect(fn) {
    activeEffect = fn;
    fn();
}

const click1 = () => {
    obj.text = 'hello vue3';
    count++;
}
btn.addEventListener('click', click1)

setTimeout(() => {
    obj.notExist = 'no exist';
}, 1000)