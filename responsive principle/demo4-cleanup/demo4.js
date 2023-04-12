// demo4
const bucket = new WeakMap();// 这里采用了weakMap弱键值对，体现在于垃圾回收机制

const data = { ok: true, text: 'hello world' };
const text = document.querySelector('#text');
const btn1 = document.querySelector('#btn1');
const btn2 = document.querySelector('#btn2')
const fn = () => { console.log('执行副作用函数'); text.innerText = obj.ok ? obj.text : 'not'; };
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
    console.log(bucket)
    activeEffect.deps.push(deps);
}

function trigger(target, key) {
    const depsMap = bucket.get(target);
    console.log(depsMap);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    // 注意这里需要重新开开辟一个内存空间集合防止进入死循环
    // 因为当读取对象的属性时，会执行其副作用函数但同时也清空其副作用函数，由此进入了死循环
    const effectToRun = new Set(effects);
    effectToRun.forEach((effectFn) => effectFn());
    // effects && effects.forEach((fn) => fn());
}

effect(fn)

function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn);
    }
    effectFn.deps.length = 0;
}

// effectFn作为副作用函数用来保存与该副作用函数相关联的依赖
function effect(fn) {
    console.log(fn)
    const effectFn = () => {
        // 当对象的属性读取时，自动清空其所有的副作用函数
        cleanup(effectFn)
        activeEffect = effectFn;
        fn();
    }
    effectFn.deps = [];
    effectFn()
}

const click1 = () => {
    obj.ok = false;
}
const click2 = () => {
    obj.text = 'hello vue3'
}
btn1.addEventListener('click', click1)
btn2.addEventListener('click', click2)