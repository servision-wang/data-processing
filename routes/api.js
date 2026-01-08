const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const User = require('../models/User')
const lockfile = require('proper-lockfile')

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../data/config.json')
const USER_STATS_FILE = path.join(__dirname, '../data/user_stats.json')

// 历史记录限制配置
const MAX_HISTORY_RECORDS = 100  // 每个用户最多保留100条历史记录

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
}

// 中间件：检查登录状态和用户是否过期
async function requireAuth(req, res, next) {
    const userId = req.session.user ? req.session.user.id : null
    if (!userId) {
        return res.status(401).json({ success: false, message: '未登录', needLogin: true })
    }

    try {
        // 检查用户是否存在以及是否过期
        const user = await User.findById(userId)
        if (!user) {
            req.session.destroy()
            return res.status(401).json({ success: false, message: '用户不存在', needLogin: true })
        }

        // 检查账号是否过期（管理员账号不检查）
        if (!user.is_admin && User.isExpired(user)) {
            req.session.destroy()
            return res.status(401).json({ success: false, message: '您的账号已过期，请联系管理员', needLogin: true })
        }

        req.userId = userId
        next()
    } catch (error) {
        console.error('认证检查失败:', error)
        return res.status(500).json({ success: false, message: '服务器错误' })
    }
}

// 辅助函数：读写用户统计数据
// 数据结构：{ userId: { scores: {name: score}, history: [{...}] } }
function getUserStats(userId) {
    if (!fs.existsSync(USER_STATS_FILE)) {
        return { scores: {}, history: [] }
    }
    try {
        const data = fs.readFileSync(USER_STATS_FILE, 'utf8')
        const allStats = JSON.parse(data)
        const userStats = allStats[userId] || { scores: {}, history: [] }

        // 兼容旧数据格式（如果是对象但没有 scores 字段，说明是旧格式）
        if (!userStats.scores && !userStats.history) {
            return { scores: userStats, history: [] }
        }

        return userStats
    } catch (e) {
        console.error('读取统计失败', e)
        return { scores: {}, history: [] }
    }
}

async function saveUserStats(userId, userStats) {
    // 确保文件存在
    if (!fs.existsSync(USER_STATS_FILE)) {
        fs.writeFileSync(USER_STATS_FILE, '{}', 'utf8')
    }

    let release
    try {
        // 获取文件锁（最多等待5秒）
        release = await lockfile.lock(USER_STATS_FILE, {
            retries: {
                retries: 50,
                minTimeout: 100,
                maxTimeout: 500
            }
        })

        // 读取最新数据
        let allStats = {}
        try {
            const data = fs.readFileSync(USER_STATS_FILE, 'utf8')
            allStats = JSON.parse(data)
        } catch (e) {
            console.error('读取统计失败', e)
        }

        // 限制历史记录数量，只保留最近100条
        if (userStats.history && userStats.history.length > MAX_HISTORY_RECORDS) {
            userStats.history = userStats.history.slice(-MAX_HISTORY_RECORDS)
            console.log(`用户 ${userId} 的历史记录已自动清理，保留最近 ${MAX_HISTORY_RECORDS} 条`)
        }

        // 更新数据
        allStats[userId] = userStats

        // 写入文件
        fs.writeFileSync(USER_STATS_FILE, JSON.stringify(allStats, null, 4), 'utf8')

        return true
    } catch (e) {
        console.error('保存统计失败', e)
        return false
    } finally {
        // 释放锁
        if (release) {
            try {
                await release()
            } catch (e) {
                console.error('释放文件锁失败', e)
            }
        }
    }
}

// 获取用户统计列表
router.get('/user-stats/list', requireAuth, (req, res) => {
    try {
        const userStats = getUserStats(req.userId)
        const scores = userStats.scores || {}

        // 转换为数组格式方便前端展示
        const list = Object.keys(scores).map(name => ({
            name,
            score: scores[name]
        }))

        // 按积分由高到低排序
        list.sort((a, b) => b.score - a.score)

        res.json({ success: true, list })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
})

// 更新单个用户积分（包括新增用户）
router.post('/user-stats/update', requireAuth, async (req, res) => {
    try {
        const { name, score } = req.body
        const userStats = getUserStats(req.userId)
        const scores = userStats.scores || {}
        const history = userStats.history || []

        const newScore = parseFloat(score) || 0
        const isNewUser = scores[name] === undefined
        const oldScore = isNewUser ? 0 : scores[name]

        // 只有当积分不为0或者是更新已有用户时，才记录历史
        if (newScore !== 0 || !isNewUser) {
            // 创建历史记录
            const historyEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                type: isNewUser ? 'manual_add' : 'manual_update',
                operation: isNewUser ? '手动新增用户' : '手动更新用户',
                changes: {
                    name: name,
                    oldScore: oldScore,
                    newScore: newScore,
                    scoreDiff: newScore - oldScore
                },
                scoresBeforeChange: { ...scores }
            }

            history.push(historyEntry)
            userStats.history = history
        }

        scores[name] = newScore
        userStats.scores = scores
        await saveUserStats(req.userId, userStats)

        res.json({ success: true })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
})

// 清空所有用户积分
router.post('/user-stats/clear', requireAuth, async (req, res) => {
    try {
        await saveUserStats(req.userId, { scores: {}, history: [] })
        res.json({ success: true })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
})

// 删除单个用户
router.post('/user-stats/delete', requireAuth, async (req, res) => {
    try {
        const { name } = req.body
        const userStats = getUserStats(req.userId)
        const scores = userStats.scores || {}
        const history = userStats.history || []

        if (scores[name] !== undefined) {
            const oldScore = scores[name]

            // 创建删除操作的历史记录
            const historyEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                type: 'manual_delete',
                operation: '手动删除用户',
                deletedUser: {
                    name: name,
                    score: oldScore
                },
                scoresBeforeChange: { ...scores }
            }

            // 执行删除
            delete scores[name]
            userStats.scores = scores

            // 保存历史记录
            history.push(historyEntry)
            userStats.history = history

            await saveUserStats(req.userId, userStats)
        }
        res.json({ success: true })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
})

// 编辑用户（支持改名和修改积分）
router.post('/user-stats/edit', requireAuth, async (req, res) => {
    try {
        const { oldName, newName, score } = req.body
        const userStats = getUserStats(req.userId)
        const scores = userStats.scores || {}
        const history = userStats.history || []

        // 如果改了名字，且新名字已存在（且不是自己），则报错
        if (oldName !== newName && scores[newName] !== undefined) {
            return res.json({ success: false, message: '用户名已存在' })
        }

        const oldScore = scores[oldName]
        const newScore = parseFloat(score) || 0

        // 创建编辑操作的历史记录
        const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: 'manual_edit',
            operation: '手动编辑用户',
            changes: {
                oldName: oldName,
                newName: newName,
                oldScore: oldScore !== undefined ? oldScore : 0,
                newScore: newScore,
                scoreDiff: newScore - (oldScore !== undefined ? oldScore : 0)
            },
            scoresBeforeChange: { ...scores }
        }

        // 删除旧的
        if (scores[oldName] !== undefined) {
            delete scores[oldName]
        }

        // 设置新的
        scores[newName] = newScore
        userStats.scores = scores

        // 保存历史记录
        history.push(historyEntry)
        userStats.history = history

        await saveUserStats(req.userId, userStats)

        res.json({ success: true })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
})

// 获取历史记录列表
router.get('/user-stats/history', requireAuth, (req, res) => {
    try {
        const userStats = getUserStats(req.userId)
        const history = userStats.history || []

        // 返回历史记录列表（倒序，最新的在前）
        res.json({ success: true, history: history.reverse() })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
})

// 回退到指定版本（删除该版本之后的所有记录）
router.post('/user-stats/rollback', requireAuth, async (req, res) => {
    try {
        const { versionId } = req.body
        const userStats = getUserStats(req.userId)
        const history = userStats.history || []

        // 查找目标版本
        const versionIndex = history.findIndex(h => h.id === versionId)
        if (versionIndex === -1) {
            return res.json({ success: false, message: '版本不存在' })
        }

        const targetVersion = history[versionIndex]

        // 恢复到该版本计算前的积分状态
        userStats.scores = { ...targetVersion.scoresBeforeChange }

        // 删除该版本及之后的所有记录
        userStats.history = history.slice(0, versionIndex)

        await saveUserStats(req.userId, userStats)
        res.json({ success: true, message: '已回退到选定版本' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
})

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
        { min: 2401, max: 3080, deduction: 120 },
        { min: 3081, max: 3800, deduction: 150 },
        { min: 3801, max: Infinity, deduction: 300 },
    ]
}

// 获取配置 - 每个用户独立配置
router.get('/config/get', requireAuth, (req, res) => {
    try {
        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }

        // 返回该用户的配置，如果不存在则返回默认配置
        const userConfig = allConfigs[req.userId] || DEFAULT_CONFIG
        res.json({ success: true, config: userConfig })
    } catch (error) {
        console.error('读取配置失败:', error)
        res.json({ success: true, config: DEFAULT_CONFIG })
    }
})

// 保存配置 - 保存到当前用户的配置
router.post('/config/save', requireAuth, (req, res) => {
    try {
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
        allConfigs[req.userId] = config

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
router.post('/calculate', requireAuth, async (req, res) => {
    try {
        const { dataGroups, hitNumber } = req.body

        if (!dataGroups || !hitNumber) {
            return res.json({ success: false, message: '参数不完整' })
        }

        // 读取用户配置
        let allConfigs = {}
        if (fs.existsSync(CONFIG_FILE)) {
            const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
            allConfigs = JSON.parse(configData)
        }
        const currentConfig = allConfigs[req.userId] || DEFAULT_CONFIG

        const processedData = []
        const calculatedResults = []
        let totalSum = 0
        let positiveSum = 0
        let negativeSum = 0
        let maxDigits = 0

        // 临时记录本次计算中每个用户的变动，用于计算结束后的总积分展示
        // key: label, value: score change
        const currentSessionChanges = {}

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

                    // 累加用户积分 (注意：这里存储的是玩家视角的积分，即 calcResult.value)
                    // 如果用户赢了(value > 0)，积分增加；如果用户输了(value < 0)，积分减少
                    const userName = group.label || 'Unknown'
                    if (!currentSessionChanges[userName]) currentSessionChanges[userName] = 0
                    currentSessionChanges[userName] += calcResult.value
                }
            }
        })

        // 更新数据库并回填 totalScore 到 processedData
        // 1. 先保存历史记录（保存计算前的快照）
        const userStats = getUserStats(req.userId)
        const scores = userStats.scores || {}
        const history = userStats.history || []

        // 创建精简的历史记录条目（只保存关键信息）
        const historyEntry = {
            id: Date.now(), // 使用时间戳作为唯一ID
            timestamp: new Date().toISOString(),
            hitNumber: hitNumber,
            totalSum: totalSum,
            scoreChanges: { ...currentSessionChanges }, // 本次各用户的积分变动
            scoresBeforeChange: { ...scores } // 计算前的积分快照
        }

        // 2. 将本次变动应用到数据库
        Object.keys(currentSessionChanges).forEach(name => {
            if (scores[name] === undefined) scores[name] = 0
            scores[name] += currentSessionChanges[name]
        })

        // 3. 保存到历史记录
        history.push(historyEntry)
        userStats.scores = scores
        userStats.history = history
        await saveUserStats(req.userId, userStats)

        // 4. 为每条处理过的数据添加该用户当前的总积分
        processedData.forEach(item => {
            const userName = item.label || 'Unknown'
            item.totalScore = scores[userName] !== undefined ? scores[userName] : 0
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
