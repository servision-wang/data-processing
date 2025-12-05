const fs = require('fs')
const path = require('path')
const { minify } = require('terser')

async function minifyFile(inputPath, outputPath) {
    const code = fs.readFileSync(inputPath, 'utf-8')

    const result = await minify(code, {
        compress: {
            drop_console: true,           // 删除 console
            drop_debugger: true,          // 删除 debugger
            pure_funcs: ['console.log'],  // 删除 console.log
            passes: 3,                    // 多次压缩优化
            unsafe: true,                 // 启用不安全优化
            unsafe_comps: true,           // 不安全的比较优化
            unsafe_math: true,            // 不安全的数学优化
            unsafe_proto: true,           // 不安全的原型优化
            sequences: true,              // 合并连续语句
            dead_code: true,              // 删除死代码
            conditionals: true,           // 优化条件表达式
            evaluate: true,               // 计算常量表达式
            booleans: true,               // 优化布尔值
            loops: true,                  // 优化循环
            if_return: true,              // 优化 if/return
            join_vars: true,              // 合并变量声明
            collapse_vars: true,          // 内联变量
            reduce_vars: true,            // 优化变量赋值
            hoist_funs: true,             // 提升函数声明
            hoist_vars: true              // 提升变量声明
        },
        mangle: {
            toplevel: true,               // 混淆顶级作用域
            eval: true,                   // 混淆 eval 相关
            properties: true              // 混淆所有属性名（最强混淆）
        },
        output: {
            comments: false,              // 删除注释
            beautify: false,              // 不美化代码
            ascii_only: true,             // 转义非 ASCII 字符
            ecma: 2015                    // 使用 ES6 语法压缩
        }
    })

    if (result.code) {
        fs.writeFileSync(outputPath, result.code)
        const originalSize = (fs.statSync(inputPath).size / 1024).toFixed(2)
        const minifiedSize = (fs.statSync(outputPath).size / 1024).toFixed(2)
        console.log(`✅ ${path.basename(inputPath)} (${originalSize}KB) -> ${path.basename(outputPath)} (${minifiedSize}KB)`)
    }
}

async function build() {
    console.log('🚀 开始构建...\n')

    try {
        // 压缩 tool.js
        await minifyFile(
            './public/js/tool.js',
            './public/js/tool.min.js'
        )

        // 压缩 admin.js
        await minifyFile(
            './public/js/admin.js',
            './public/js/admin.min.js'
        )

        console.log('\n✅ 构建完成！')
    } catch (error) {
        console.error('❌ 构建失败:', error)
        process.exit(1)
    }
}

build()
