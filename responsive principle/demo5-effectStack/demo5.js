// demo5
// 搞不懂...
const bucket = new WeakMap();// 这里采用了weakMap弱键值对，体现在于垃圾回收机制

const data = { foo: true, bar: true };
const foo = document.querySelector('#foo');
const bar = document.querySelector('#bar');
const btn1 = document.querySelector('#btn1');
const btn2 = document.querySelector('#btn2');
const effectStack = []; //将外层的副作用函数保存起来
let temp1, temp2;
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
    console.log(bucket)
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
    activeEffect.deps.push(deps);
}

function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    // 注意这里需要重新开开辟一个内存空间集合防止进入死循环
    // 因为当读取对象的属性时，会执行其副作用函数但同时也清空其副作用函数，由此进入了死循环
    console.log(effects)
    const effectToRun = new Set(effects);
    console.log(effectToRun)
    effectToRun.forEach((effectFn) => effectFn());
    // effects && effects.forEach((fn) => fn());
}

effect(function effectFn1() {
    console.log('effectFn1 执行');
    effect(function effectFn2() {
        console.log('effectFn2 执行');
        bar.innerText = obj.bar;
    })
    foo.innerText = obj.foo
})

function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn);
    }
    effectFn.deps.length = 0;
}

// effectFn作为副作用函数用来保存与该副作用函数相关联的依赖
function effect(fn) {
    const effectFn = () => {
        // 当对象的属性读取时，自动清空其所有的副作用函数
        cleanup(effectFn);
        activeEffect = effectFn;
        // 防止副作用函数执行时，影响其他属性
        effectStack.push(effectFn);
        fn();// 副作用函数本质是执行这个函数，外部只是一个封装，确保执行属性与其副作用函数一一对应
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
        console.log('bucket', bucket)
    }
    effectFn.deps = [];
    effectFn()
}

const click1 = () => {
    obj.foo = 'foo123';
}
const click2 = () => {
    obj.bar = 'bar123'
}
btn1.addEventListener('click', click1)
btn2.addEventListener('click', click2)