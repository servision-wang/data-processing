const fs = require('fs')
const path = require('path')
const JavaScriptObfuscator = require('javascript-obfuscator')

function obfuscateFile(inputPath, outputPath) {
    const code = fs.readFileSync(inputPath, 'utf-8')

    const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        // 压缩选项
        compact: true,                          // 压缩成一行

        // 变量名混淆
        identifierNamesGenerator: 'hexadecimal', // 使用十六进制变量名 (_0x1a2b)
        renameGlobals: false,                    // 不重命名全局变量（避免破坏 DOM）

        // 字符串加密
        stringArray: true,                       // 启用字符串数组
        stringArrayEncoding: ['base64'],         // Base64 编码字符串
        stringArrayThreshold: 0.75,              // 75% 的字符串会被加密
        rotateStringArray: true,                 // 旋转字符串数组
        shuffleStringArray: true,                // 打乱字符串数组

        // 控制流混淆
        controlFlowFlattening: true,             // 启用控制流扁平化
        controlFlowFlatteningThreshold: 0.5,     // 50% 的函数被混淆

        // 死代码注入
        deadCodeInjection: true,                 // 注入死代码
        deadCodeInjectionThreshold: 0.2,         // 20% 的死代码

        // 调试保护
        debugProtection: false,                  // 禁用调试保护（会影响性能）
        debugProtectionInterval: 0,

        // 其他选项
        selfDefending: false,                    // 禁用自我保护（会影响性能）
        disableConsoleOutput: true,              // 禁用 console 输出
        numbersToExpressions: true,              // 将数字转换为表达式
        simplify: true,                          // 简化代码
        splitStrings: true,                      // 分割字符串
        splitStringsChunkLength: 10,             // 每10个字符分割
        transformObjectKeys: true,               // 转换对象键
        unicodeEscapeSequence: false             // 不使用 Unicode 转义（保持中文可读）
    })

    fs.writeFileSync(outputPath, obfuscated.getObfuscatedCode())

    const originalSize = (fs.statSync(inputPath).size / 1024).toFixed(2)
    const obfuscatedSize = (fs.statSync(outputPath).size / 1024).toFixed(2)
    console.log(`✅ ${path.basename(inputPath)} (${originalSize}KB) -> ${path.basename(outputPath)} (${obfuscatedSize}KB)`)
}

async function build() {
    console.log('🔐 开始高级混淆构建...\n')

    try {
        // 混淆 tool.js
        obfuscateFile(
            './public/js/tool.js',
            './public/js/tool.min.js'
        )

        // 混淆 admin.js
        obfuscateFile(
            './public/js/admin.js',
            './public/js/admin.min.js'
        )

        console.log('\n✅ 高级混淆完成！')
        console.log('💡 代码已加密，几乎无法逆向')
    } catch (error) {
        console.error('❌ 混淆失败:', error)
        process.exit(1)
    }
}

build()
