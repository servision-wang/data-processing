const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../data/config.json')

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
}

// 默认配置
const DEFAULT_CONFIG = {
    specialChars: ['挖', '爬'],
    deductionRules: [
        { min: 81, max: 199, deduction: 5 },
        { min: 200, max: 399, deduction: 10 },
        { min: 400, max: 599, deduction: 20 },
        { min: 600, max: 799, deduction: 30 },
        { min: 800, max: 1049, deduction: 40 },
        { min: 1050, max: 1999, deduction: 50, increment: 10, interval: 200 },
        { min: 2000, max: 2080, deduction: 80 },
        { min: 2081, max: 2400, deduction: 100 },
        { min: 2401, max: Infinity, deduction: 120 }
    ]
}

// 获取配置 - 每个用户独立配置
router.get('/config/get', (req, res) => {
    try {
        // 获取当前登录用户ID
        const userId = req.session.user ? req.session.user.id : null
        if (!userId) {
            return res.json({ success: false, message: '未登录' })
        }

        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }

        // 返回该用户的配置，如果不存在则返回默认配置
        const userConfig = allConfigs[userId] || DEFAULT_CONFIG
        res.json({ success: true, config: userConfig })
    } catch (error) {
        console.error('读取配置失败:', error)
        res.json({ success: true, config: DEFAULT_CONFIG })
    }
})

// 保存配置 - 保存到当前用户的配置
router.post('/config/save', (req, res) => {
    try {
        // 获取当前登录用户ID
        const userId = req.session.user ? req.session.user.id : null
        if (!userId) {
            return res.json({ success: false, message: '未登录' })
        }

        const config = req.body

        if (!config || !Array.isArray(config.specialChars) || !Array.isArray(config.deductionRules)) {
            return res.json({ success: false, message: '配置格式不正确' })
        }

        // 读取所有配置
        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }

        // 更新当前用户的配置
        allConfigs[userId] = config

        // 保存回文件
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(allConfigs, null, 2), 'utf8')
        res.json({ success: true, message: '保存成功' })
    } catch (error) {
        console.error('保存配置失败:', error)
        res.json({ success: false, message: '保存失败: ' + error.message })
    }
})

// 删除用户配置 - 当用户被删除时调用
router.post('/config/delete/:userId', (req, res) => {
    try {
        const userId = req.params.userId

        // 读取所有配置
        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }

        // 删除该用户的配置
        if (allConfigs[userId]) {
            delete allConfigs[userId]
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(allConfigs, null, 2), 'utf8')
        }

        res.json({ success: true, message: '配置已删除' })
    } catch (error) {
        console.error('删除配置失败:', error)
        res.json({ success: false, message: '删除失败: ' + error.message })
    }
})

// 计算结果 - 将计算逻辑移至后端
router.post('/calculate', (req, res) => {
    try {
        const { dataGroups, hitNumber } = req.body
        const userId = req.session.user ? req.session.user.id : null

        if (!userId) {
            return res.json({ success: false, message: '未登录' })
        }

        if (!dataGroups || !hitNumber) {
            return res.json({ success: false, message: '参数不完整' })
        }

        // 读取用户配置
        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }
        const currentConfig = allConfigs[userId] || DEFAULT_CONFIG

        const processedData = []
        const calculatedResults = []
        let totalSum = 0
        let positiveSum = 0
        let negativeSum = 0
        let maxDigits = 0

        // 辅助函数：验证命中数字
        function isValidHitNumber(numStr) {
            const digits = numStr.split('')
            const len = digits.length
            if (len < 1 || len > 3) return false
            if (!digits.every(d => ['1', '2', '3', '4'].includes(d))) return false
            if (len === 1 || len === 2) return true
            if (len === 3) {
                const digitCount = {}
                digits.forEach(d => { digitCount[d] = (digitCount[d] || 0) + 1 })
                return Object.keys(digitCount).length === 2
            }
            return true
        }

        // 辅助函数：应用扣减规则
        function applyProfitDeduction(profit) {
            if (profit <= 80) return { finalValue: profit, deduction: 0 }
            let deduction = 0
            for (const rule of currentConfig.deductionRules) {
                if (profit >= rule.min && (rule.max ? profit <= rule.max : true)) {
                    if (rule.increment && rule.interval) {
                        const interval = Math.floor((profit - rule.min) / rule.interval)
                        deduction = rule.deduction + interval * rule.increment
                    } else {
                        deduction = rule.deduction
                    }
                    break
                }
            }
            return { finalValue: profit - deduction, deduction: deduction }
        }

        // 辅助函数：计算结果
        function calculateResult(digits, total, hitNumber, isSpecial) {
            const numDigits = digits.length
            const totalValue = parseInt(total)
            const digitSet = digits.map(d => d)
            const isHit = digitSet.includes(hitNumber)

            if (numDigits === 1) {
                if (isHit) {
                    const result = totalValue * 3
                    const r = applyProfitDeduction(result)
                    return { value: r.finalValue, deduction: r.deduction, error: false }
                } else {
                    return { value: -totalValue, deduction: 0, error: false }
                }
            }
            else if (numDigits === 2) {
                const isDifferent = digitSet[0] !== digitSet[1]
                let result = 0
                if (isDifferent && isHit) result = totalValue * 1
                else if (!isHit) result = -totalValue
                else result = totalValue * 1

                if (totalValue <= 70) return { value: result, deduction: 0, error: false }
                const r = applyProfitDeduction(result)
                return { value: r.finalValue, deduction: r.deduction, error: false }
            }
            else if (numDigits === 3) {
                const digitCount = {}
                digitSet.forEach(d => { digitCount[d] = (digitCount[d] || 0) + 1 })
                if (Object.keys(digitCount).length === 3) return { value: 0, deduction: 0, error: true }

                if (!isHit) return { value: -totalValue, deduction: 0, error: false }

                const hitCount = digitCount[hitNumber]
                let result = 0
                if (isSpecial) {
                    if (hitCount >= 2) {
                        result = totalValue * 2
                        const r = applyProfitDeduction(result)
                        return { value: r.finalValue, deduction: r.deduction, error: false }
                    } else {
                        return { value: 0, deduction: 0, error: false }
                    }
                } else {
                    if (hitCount >= 2) {
                        result = totalValue * 1.5
                        const r = applyProfitDeduction(result)
                        return { value: r.finalValue, deduction: r.deduction, error: false }
                    } else {
                        result = totalValue * 0.5
                        return { value: result, deduction: 0, error: false }
                    }
                }
            }
            return { value: -totalValue, deduction: 0, error: false }
        }

        // 处理每组数据
        dataGroups.forEach(group => {
            const normalizedData = group.data.replace(/[。]/g, '/')
            const parts = normalizedData.split(/[^\d]+/).filter(p => p.trim() !== '')

            if (parts.length >= 2) {
                let firstNumber = parts[0].trim()
                let secondNumber = parts[1].trim()

                const firstIsValid = isValidHitNumber(firstNumber)
                const secondIsValid = isValidHitNumber(secondNumber)
                const secondIsSingleDigit = secondNumber.length === 1 && ['1', '2', '3', '4'].includes(secondNumber)

                if ((!firstIsValid && secondIsValid) || (!firstIsValid && secondIsSingleDigit)) {
                    [firstNumber, secondNumber] = [secondNumber, firstNumber]
                }

                if (!isValidHitNumber(firstNumber)) {
                    processedData.push({
                        label: group.label,
                        digits: [],
                        total: secondNumber,
                        isInvalid: true,
                        originalData: group.data
                    })
                    calculatedResults.push({ value: 0, deduction: 0, error: true })
                    return
                }

                const digits = firstNumber.split('')
                if (digits.length > maxDigits) maxDigits = digits.length

                // 检查是否包含特殊字符
                let isSpecial = false
                let specialCharValue = ''
                for (const char of currentConfig.specialChars) {
                    if (group.data.includes(char)) {
                        isSpecial = true
                        specialCharValue = char
                        break
                    }
                }

                const itemData = {
                    label: group.label,
                    digits: digits,
                    total: secondNumber,
                    isInvalid: false,
                    isSpecial: isSpecial,
                    specialChar: specialCharValue,
                    originalData: group.data
                }
                processedData.push(itemData)

                const calcResult = calculateResult(digits, secondNumber, hitNumber, isSpecial)
                calculatedResults.push(calcResult)

                if (!calcResult.error) {
                    const bankerValue = -calcResult.value
                    totalSum += bankerValue
                    if (bankerValue > 0) positiveSum += bankerValue
                    else negativeSum += bankerValue
                }
            }
        })

        res.json({
            success: true,
            processedData,
            calculatedResults,
            summary: {
                totalSum,
                positiveSum,
                negativeSum,
                maxDigits
            }
        })

    } catch (error) {
        console.error('计算失败:', error)
        res.json({ success: false, message: '计算失败: ' + error.message })
    }
})

module.exports = router
