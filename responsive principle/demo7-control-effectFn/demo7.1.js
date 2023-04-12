// 原本打印顺序为1, 2, 结束了
// 通过增加调度改为 1, 结束了, 2
const bucket = new WeakMap();// 这里采用了weakMap弱键值对，体现在于垃圾回收机制

const data = { foo: 1 };
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

// 增加一个调度执行顺序
effect(
    () => {
        console.log(obj.foo)
    },
    {
        scheduler(fn) {
            // 将任务添加到队列中
            jobQueue.add(fn);
            // 刷新队列，
            flushJob();
        }
    }
)

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
        fn();
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
    }
    effectFn.options = options;
    effectFn.deps = [];
    effectFn()
}

// 添加一个宏任务队列
const jobQueue = new Set();
const p = Promise.resolve();

// 判断是否正在刷新队列
let isFlushing = false;
function flushJob() {
    if (isFlushing) return
    isFlushing = true;
    p.then(() => {
        jobQueue.forEach((job) => job());
    }).finally(() => {
        isFlushing = false;
    })
}

obj.foo++;
obj.foo++

