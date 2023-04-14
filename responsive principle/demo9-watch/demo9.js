const bucket = new WeakMap();// 这里采用了weakMap弱键值对，体现在于垃圾回收机制

const data = { foo: 1, bar: 1 };
const effectStack = []; //将外层的副作用函数保存起来
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
    activeEffect.deps.push(deps);
}

function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    // 注意这里需要重新开开辟一个内存空间集合防止进入死循环
    // 因为当读取对象的属性时，会执行其副作用函数但同时也清空其副作用函数，由此进入了死循环
    const effectToRun = new Set();
    effects && effects.forEach((effect) => {
        if (effect !== activeEffect) {
            effectToRun.add(effect)
        }
    })
    effectToRun.forEach((effectFn) => {
        if (effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn)
        } else {
            effectFn()
        }
    });
    // effects && effects.forEach((fn) => fn());
}

function cleanup(effectFn) {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn);
    }
    effectFn.deps.length = 0;
}

// effectFn作为副作用函数用来保存与该副作用函数相关联的依赖
function effect(fn, options = {}) {
    const effectFn = () => {
        // 当对象的属性读取时，自动清空其所有的副作用函数
        cleanup(effectFn);
        activeEffect = effectFn;
        effectStack.push(effectFn);
        const res = fn();
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
        return res
    }
    effectFn.options = options;
    effectFn.deps = [];
    if (!options.lazy) {
        effectFn()
    }
    return effectFn
}

function traverse(value, seen = new Set) {
    // 此处展示不考虑除了对象以外的其他属性, track对象中的每一个属性
    if (typeof value !== 'object' || value === null || seen.has(value)) {
        return
    }
    seen.add(value)
    for (let key in value) {
        traverse(value[key], seen);
    }
    return value
}

// 现在来封装一个computed函数 指定属性
// 递归遍历所有属性
function watch(source, cb) {
    let getter
    let oldValue, newValue
    if (typeof source === 'function') {
        getter = source
    } else {
        getter = () => traverse(source)
    }
    const effectFn = effect(() => getter(), {
        lazy: true,
        scheduler(effectFn) {
            newValue = effectFn()
            cb(newValue, oldValue)
            oldValue = newValue
        }
    })
    oldValue = effectFn()
}

watch(() => obj.foo, (newVal, oldVal) => {
    console.log(newVal, oldVal)
})
obj.foo++;