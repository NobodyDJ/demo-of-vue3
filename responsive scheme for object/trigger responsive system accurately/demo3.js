// 关键是代码对象的各项属性要与副作用函数建立联系，触发proxy
const bucket = new WeakMap();// 这里采用了weakMap弱键值对，体现在于垃圾回收机制

const effectStack = []; //将外层的副作用函数保存起来
let activeEffect;

const data = {};
const proto = { bar: 1 };
const child = reactive(data);
const parent = reactive(proto);
child.raw = data;
parent.raw = proto;
Object.setPrototypeOf(child, parent);
const ITERATE_KEY = Symbol();

function reactive(obj) {
    return new Proxy(obj, {
        get(target, key, receiver) {
            // 将副作用函数加入
            track(target, key)
            return Reflect.get(target, key, receiver);
        },
        set(target, key, newVal, receiver) {
            const oldVal = target[key]
            const type = Object.prototype.hasOwnProperty.call(target, key) ? "SET" : "ADD"
            const res = Reflect.set(target, key, newVal, receiver);
            // 合理地触发响应当设置的值与之前的相同，就没必要再次触发副作用函数
            // 后者是用来兼容NAN类型，NAN !== NAN
            // 如果当前被代理的属性，是通过原型链来找找的，不需要触发无意义的副作用函数
            if (target === reactive.raw) {
                if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
                    trigger(target, key, type);
                }
            }
            return res
        },
        ownKeys(target) {
            track(target, ITERATE_KEY);
            return Reflect.ownKeys(target);
        },
        deleteProperty(target, key) {
            const hadKey = Object.prototype.hasOwnProperty.call(target, key);
            const res = Reflect.deleteProperty(target, key);
            if (res && hadKey) {
                trigger(target, key, 'DELETE')
            }
            return res
        }
    })
}

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

function trigger(target, key, type) {
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const effects = depsMap.get(key);
    const iterateEffects = depsMap.get(ITERATE_KEY)
    // 注意这里需要重新开开辟一个内存空间集合防止进入死循环
    // 因为当读取对象的属性时，会执行其副作用函数但同时也清空其副作用函数，由此进入了死循环
    const effectToRun = new Set();
    effects && effects.forEach((effect) => {
        if (effect !== activeEffect) {
            effectToRun.add(effect)
        }
    })
    console.log(key, type)
    // 将与循环操作相关联的副作用函数也添加到新增的属性中，实现响应式
    if (type === 'ADD' || type === 'DELETE') {
        iterateEffects && iterateEffects.forEach((effectFn) => {
            if (effectFn !== activeEffect) {
                effectToRun.add(effectFn)
            }
        })
    }
    // 
    effectToRun.forEach((effectFn) => {
        if (effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn)
        } else {
            effectFn()
        }
    });
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

effect(() => {
    console.log(child.bar);
})

child.bar = 2;