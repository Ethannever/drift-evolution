const fs = require('fs');
const vm = require('vm');
const path = require('path');

// 测试简单类
const testCode = `
class Test {
    constructor(x) {
        this.x = x;
    }
    hello() {
        return "Hello " + this.x;
    }
}
const t = new Test("world");
t.hello();
`;

const context = { console, Math, performance: { now: () => 0 } };
vm.createContext(context);
const result = vm.runInContext(testCode, context);
console.log('Result:', result);
console.log('Test class:', typeof context.Test);
