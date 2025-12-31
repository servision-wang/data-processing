// 工具页面的数据处理逻辑

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

// 当前使用的配置
let currentConfig = { ...DEFAULT_CONFIG }

// 加载配置
async function loadConfig() {
    try {
        const response = await fetch('/api/config/get')
        if (response.ok) {
            const data = await response.json()
            if (data.success && data.config) {
                currentConfig = data.config
            }
        }
    } catch (error) {
        console.error('加载配置失败:', error)
    }
}

// 保存配置
async function saveConfig(config) {
    try {
        const response = await fetch('/api/config/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        })
        const data = await response.json()
        return data
    } catch (error) {
        console.error('保存配置失败:', error)
        return { success: false, message: '保存失败' }
    }
}

// 页面加载时初始化配置
window.addEventListener('DOMContentLoaded', () => {
    loadConfig()
})

function processData() {
    const input = document.getElementById('dataInput').value.trim()
    const hitNumber = document.querySelector('input[name="hitNumber"]:checked').value
    const resultsDiv = document.getElementById('results')

    if (!input) {
        notification.warning('请先输入数据！')
        return
    }

    resultsDiv.innerHTML = ''

    // 按行分割数据
    const lines = input.split('\n').filter(line => line.trim() !== '')

    let currentLabel = ''
    const dataGroups = []
    let dataIndex = 1

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (line.includes(':') || line.includes('：')) {
            // 分割标签和数据
            const colonIndex = line.search(/[:：]/)
            const label = line.substring(0, colonIndex).trim()
            const dataText = line.substring(colonIndex + 1).trim()

            // 更新当前标签
            if (label) {
                currentLabel = label
                dataIndex = 1
            }

            // 处理冒号后面的数据（如果有）
            if (dataText) {
                // 构建特殊字符正则
                const specialCharsPattern = currentConfig.specialChars.length > 0
                    ? `[${currentConfig.specialChars.join('')}]?`
                    : ''
                const pattern = new RegExp(`(\\d+)\\s*[\\/\\-+]\\s*(\\d+)${specialCharsPattern}`, 'g')
                let match

                while ((match = pattern.exec(dataText)) !== null) {
                    const hitNum = match[1]
                    const amount = match[2]
                    const separator = dataText.substring(match.index + match[1].length, match.index + match[1].length + 1).trim() || '/'

                    dataGroups.push({
                        label: currentLabel,
                        data: hitNum + separator + amount + (match[3] || ''),
                        index: dataIndex++
                    })
                }
            }
        } else {
            // 构建特殊字符正则
            const specialCharsPattern = currentConfig.specialChars.length > 0
                ? `[${currentConfig.specialChars.join('')}]?`
                : ''
            const pattern = new RegExp(`(\\d+)\\s*[\\/\\-+]\\s*(\\d+)${specialCharsPattern}`, 'g')
            let match

            while ((match = pattern.exec(line)) !== null) {
                const hitNum = match[1]
                const amount = match[2]
                const separator = line.substring(match.index + match[1].length, match.index + match[1].length + 1).trim() || '/'

                dataGroups.push({
                    label: currentLabel,
                    data: hitNum + separator + amount + (match[3] || ''),
                    index: dataIndex++
                })
            }
        }
    }

    displayAllData(dataGroups, hitNumber)
}

function isValidHitNumber(numStr) {
    const digits = numStr.split('')
    const len = digits.length

    // 只能是1位、2位或3位
    if (len < 1 || len > 3) {
        return false
    }

    // 所有数字必须是1、2、3、4
    if (!digits.every(d => ['1', '2', '3', '4'].includes(d))) {
        return false
    }

    // 1位数：直接有效
    if (len === 1) {
        return true
    }

    // 2位数：直接有效
    if (len === 2) {
        return true
    }

    // 3位数：必须有且仅有2种不同的数字（即有一位重复）
    if (len === 3) {
        const digitCount = {}
        digits.forEach(d => {
            digitCount[d] = (digitCount[d] || 0) + 1
        })
        const uniqueCount = Object.keys(digitCount).length
        if (uniqueCount !== 2) {
            return false
        }
    }

    return true
}

function displayAllData(dataGroups, hitNumber) {
    const resultsDiv = document.getElementById('results')

    if (dataGroups.length === 0) {
        resultsDiv.innerHTML = '<p>没有可显示的数据</p>'
        return
    }

    let maxDigits = 0
    const processedData = []

    dataGroups.forEach(group => {
        const normalizedData = group.data.replace(/[。]/g, '/')
        const parts = normalizedData.split(/[^\d]+/).filter(p => p.trim() !== '')

        if (parts.length >= 2) {
            let firstNumber = parts[0].trim()
            let secondNumber = parts[1].trim()

            // 智能识别：如果第一个数字不是有效命中数字，尝试交换
            // 或者第二个数字是单个数字（1-4），也交换
            const firstIsValid = isValidHitNumber(firstNumber)
            const secondIsValid = isValidHitNumber(secondNumber)
            const secondIsSingleDigit = secondNumber.length === 1 && ['1', '2', '3', '4'].includes(secondNumber)

            if ((!firstIsValid && secondIsValid) || (!firstIsValid && secondIsSingleDigit)) {
                [firstNumber, secondNumber] = [secondNumber, firstNumber]
            }

            // 再次验证：如果交换后仍然无效，标记为错误数据
            if (!isValidHitNumber(firstNumber)) {
                processedData.push({
                    label: group.label,
                    digits: [],
                    total: secondNumber,
                    isInvalid: true,
                    originalData: group.data
                })
                return
            }

            const digits = firstNumber.split('')

            if (digits.length > maxDigits) {
                maxDigits = digits.length
            }

            processedData.push({
                label: group.label,
                digits: digits,
                total: secondNumber,
                isInvalid: false,
                isSpecial: currentConfig.specialChars.some(char => normalizedData.includes(char))
            })
        }
    })

    if (processedData.length === 0) {
        resultsDiv.innerHTML = '<p>数据格式不正确，请确保格式类似：244/270 或 12-780</p>'
        return
    }

    let totalSum = 0
    let positiveSum = 0
    let negativeSum = 0
    const calculatedResults = []

    processedData.forEach(item => {
        // 如果数据本身无效，直接标记为错误
        if (item.isInvalid) {
            calculatedResults.push({ value: 0, deduction: 0, error: true })
            return
        }

        const calcResult = calculateResult(item.digits, item.total, hitNumber, item.isSpecial)
        calculatedResults.push(calcResult)

        if (!calcResult.error) {
            // 庄家视角：取反
            const bankerValue = -calcResult.value
            totalSum += bankerValue
            if (bankerValue > 0) {
                positiveSum += bankerValue
            } else {
                negativeSum += bankerValue
            }
        }
    })

    const summaryBox = document.createElement('div')
    summaryBox.className = 'summary-box'

    const totalClass = totalSum >= 0 ? 'positive' : 'negative'
    summaryBox.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">命中数字：</span>
            <span class="summary-value" style="color: #2196F3; font-size: 24px;">${hitNumber}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">总计：</span>
            <span class="summary-value ${totalClass}">${totalSum.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">正数合计：</span>
            <span class="summary-value positive">${positiveSum.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">负数合计：</span>
            <span class="summary-value negative">${negativeSum.toFixed(2)}</span>
        </div>
    `
    resultsDiv.appendChild(summaryBox)

    const table = document.createElement('table')
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')

    const thIndex = document.createElement('th')
    thIndex.textContent = '序号'
    headerRow.appendChild(thIndex)

    const thLabel = document.createElement('th')
    thLabel.textContent = '标签'
    headerRow.appendChild(thLabel)

    for (let i = 0; i < maxDigits; i++) {
        const th = document.createElement('th')
        th.textContent = `第${i + 1}位`
        headerRow.appendChild(th)
    }

    const thTotal = document.createElement('th')
    thTotal.textContent = '积分'
    headerRow.appendChild(thTotal)

    const thDeduction = document.createElement('th')
    thDeduction.textContent = '打水'
    headerRow.appendChild(thDeduction)

    const thResult = document.createElement('th')
    thResult.textContent = '正负'
    headerRow.appendChild(thResult)

    thead.appendChild(headerRow)
    table.appendChild(thead)

    const tbody = document.createElement('tbody')

    processedData.forEach((item, index) => {
        const dataRow = document.createElement('tr')
        const calcResult = calculatedResults[index]

        if (calcResult.error || item.isInvalid) {
            dataRow.className = 'error-row'
        }

        const tdIndex = document.createElement('td')
        tdIndex.textContent = index + 1
        dataRow.appendChild(tdIndex)

        const tdLabel = document.createElement('td')
        tdLabel.className = 'label-cell'
        tdLabel.textContent = item.label
        dataRow.appendChild(tdLabel)

        // 如果是无效数据，显示原始数据并标记错误
        if (item.isInvalid) {
            const tdInvalid = document.createElement('td')
            tdInvalid.colSpan = maxDigits + 3 // 合并剩余所有列
            tdInvalid.innerHTML = `<span class="error-message">数据格式错误: ${item.originalData}</span>`
            tdInvalid.style.textAlign = 'left'
            tdInvalid.style.paddingLeft = '15px'
            dataRow.appendChild(tdInvalid)
            tbody.appendChild(dataRow)
            return
        }

        for (let i = 0; i < maxDigits; i++) {
            const td = document.createElement('td')

            if (i < item.digits.length) {
                td.className = 'digit-cell'
                td.textContent = item.digits[i]

                if (item.digits[i] === hitNumber) {
                    td.classList.add('match-highlight')
                }
            } else {
                td.textContent = '-'
            }

            dataRow.appendChild(td)
        }

        const tdTotal = document.createElement('td')
        tdTotal.textContent = item.total
        dataRow.appendChild(tdTotal)

        const tdDeduction = document.createElement('td')
        if (calcResult.error) {
            tdDeduction.textContent = '-'
        } else if (calcResult.deduction > 0) {
            tdDeduction.innerHTML = `<span style="color: #ff9800; font-weight: 600;">${calcResult.deduction}</span>`
        } else {
            tdDeduction.textContent = '0'
        }
        dataRow.appendChild(tdDeduction)

        const tdResult = document.createElement('td')
        if (calcResult.error) {
            tdResult.innerHTML = `<span class="error-message">数据有误</span>`
        } else {
            // 庄家视角：取反显示
            const bankerValue = -calcResult.value
            if (bankerValue < 0) {
                tdResult.innerHTML = `<span class="result-negative">${bankerValue}</span>`
            } else {
                tdResult.innerHTML = `<span class="result-positive">${bankerValue}</span>`
            }
        }
        dataRow.appendChild(tdResult)

        tbody.appendChild(dataRow)
    })

    table.appendChild(tbody)
    resultsDiv.appendChild(table)
}

function calculateResult(digits, total, hitNumber, isSpecial = false) {
    const numDigits = digits.length
    const totalValue = parseInt(total)
    const digitSet = digits.map(d => d)

    const isHit = digitSet.includes(hitNumber)

    // 1位数计算
    if (numDigits === 1) {
        if (isHit) {
            const result = totalValue * 3
            // 1位数也按照正常打水规则：积分>=80才打水
            const resultWithDeduction = applyProfitDeduction(result)
            return {
                value: resultWithDeduction.finalValue,
                deduction: resultWithDeduction.deduction,
                error: false
            }
        } else {
            return { value: -totalValue, deduction: 0, error: false }
        }
    }

    // 2位数计算
    if (numDigits === 2) {
        const isDifferent = digitSet[0] !== digitSet[1]
        let result = 0

        if (isDifferent && isHit) {
            result = totalValue * 1
        } else if (!isHit) {
            result = -totalValue
        } else {
            result = totalValue * 1
        }

        // 2位数且本金<=70，正常计算（不扣减）
        if (totalValue <= 70) {
            return { value: result, deduction: 0, error: false }
        }

        // 本金>70，需要扣减
        const resultWithDeduction = applyProfitDeduction(result)
        return {
            value: resultWithDeduction.finalValue,
            deduction: resultWithDeduction.deduction,
            error: false
        }
    }

    // 3位数计算
    if (numDigits === 3) {
        const digitCount = {}
        digitSet.forEach(d => {
            digitCount[d] = (digitCount[d] || 0) + 1
        })

        const uniqueDigits = Object.keys(digitCount).length

        if (uniqueDigits === 3) {
            return { value: 0, deduction: 0, error: true }
        }

        if (!isHit) {
            return { value: -totalValue, deduction: 0, error: false }
        }

        const hitCount = digitCount[hitNumber]
        let result = 0

        // 如果是特殊类型，使用特殊规则
        if (isSpecial) {
            if (hitCount >= 2) {
                result = totalValue * 2
                const resultWithDeduction = applyProfitDeduction(result)
                return {
                    value: resultWithDeduction.finalValue,
                    deduction: resultWithDeduction.deduction,
                    error: false
                }
            } else {
                return { value: 0, deduction: 0, error: false }
            }
        } else {
            // 正常规则
            if (hitCount >= 2) {
                result = totalValue * 1.5
                // 命中的是重复数字，需要扣减
                const resultWithDeduction = applyProfitDeduction(result)
                return {
                    value: resultWithDeduction.finalValue,
                    deduction: resultWithDeduction.deduction,
                    error: false
                }
            } else {
                result = totalValue * 0.5
                // 命中的是非重复数字，正常计算（不扣减）
                return { value: result, deduction: 0, error: false }
            }
        }
    }

    return { value: -totalValue, deduction: 0, error: false }
}

/**
 * 应用积分扣减规则（支持自定义）
 */
function applyProfitDeduction(profit) {
    if (profit <= 80) {
        return { finalValue: profit, deduction: 0 }
    }

    let deduction = 0

    for (const rule of currentConfig.deductionRules) {
        if (profit >= rule.min && profit <= rule.max) {
            if (rule.increment && rule.interval) {
                // 递增规则
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

function clearAll() {
    document.getElementById('dataInput').value = ''
    document.getElementById('results').innerHTML = ''
    document.querySelector('input[name="hitNumber"][value="1"]').checked = true
}
