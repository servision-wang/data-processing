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

async function processData() {
    const input = document.getElementById('dataInput').value.trim()
    const hitNumber = document.querySelector('input[name="hitNumber"]:checked').value
    const resultsDiv = document.getElementById('results')

    if (!input) {
        notification.warning('请先输入数据！')
        return
    }

    resultsDiv.innerHTML = '<p>正在计算...</p>'

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

            // 处理冒号后面的数据(如果有)
            if (dataText) {
                // 构建特殊字符正则 - 支持多字符特殊标记（如 "wa"）
                const specialCharsPattern = currentConfig.specialChars.length > 0
                    ? `(${currentConfig.specialChars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})?`
                    : '()?'
                // 匹配两个数字之间的任意非数字字符作为分隔符
                const pattern = new RegExp(`(\\d+)\\s*([^\\d\\s]+)\\s*(\\d+)\\s*${specialCharsPattern}`, 'g')
                let match

                while ((match = pattern.exec(dataText)) !== null) {
                    const hitNum = match[1]
                    const separator = match[2]  // 捕获实际的分隔符(/, //, --, +-/, 等任意字符)
                    const amount = match[3]
                    const specialChar = match[4] || ''

                    dataGroups.push({
                        label: currentLabel,
                        data: hitNum + separator + amount + specialChar,
                        index: dataIndex++
                    })
                }
            }
        } else {
            // 构建特殊字符正则 - 支持多字符特殊标记（如 "wa"）
            const specialCharsPattern = currentConfig.specialChars.length > 0
                ? `(${currentConfig.specialChars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})?`
                : '()?'
            // 匹配两个数字之间的任意非数字字符作为分隔符
            const pattern = new RegExp(`(\\d+)\\s*([^\\d\\s]+)\\s*(\\d+)\\s*${specialCharsPattern}`, 'g')
            let match

            while ((match = pattern.exec(line)) !== null) {
                const hitNum = match[1]
                const separator = match[2]  // 捕获实际的分隔符(/, //, --, +-/, 等任意字符)
                const amount = match[3]
                const specialChar = match[4] || ''

                dataGroups.push({
                    label: currentLabel,
                    data: hitNum + separator + amount + specialChar,
                    index: dataIndex++
                })
            }
        }
    }

    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dataGroups, hitNumber })
        })

        if (!response.ok) {
            throw new Error('Network response was not ok')
        }

        const result = await response.json()

        if (result.success) {
            displayAllData(result.processedData, result.calculatedResults, result.summary, hitNumber)
        } else {
            notification.error(result.message || '计算失败')
            resultsDiv.innerHTML = `<p class="error-message">计算失败: ${result.message}</p>`
        }
    } catch (error) {
        console.error('计算请求失败:', error)
        notification.error('计算请求失败')
        resultsDiv.innerHTML = '<p class="error-message">计算请求失败，请稍后重试</p>'
    }
}

function displayAllData(processedData, calculatedResults, summary, hitNumber) {
    const resultsDiv = document.getElementById('results')
    resultsDiv.innerHTML = ''

    if (processedData.length === 0) {
        resultsDiv.innerHTML = '<p>没有可显示的数据</p>'
        return
    }

    const { totalSum, positiveSum, negativeSum, maxDigits } = summary

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
        <button onclick="copyResults()" style="margin-left: auto; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600;">
            📋 复制结果
        </button>
    `
    resultsDiv.appendChild(summaryBox)

    // 将数据存储到全局变量供复制使用
    window.currentResults = {
        processedData: processedData,
        calculatedResults: calculatedResults
    }

    const table = document.createElement('table')
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')

    const thIndex = document.createElement('th')
    thIndex.textContent = '序号'
    headerRow.appendChild(thIndex)

    const thLabel = document.createElement('th')
    thLabel.textContent = '用户'
    headerRow.appendChild(thLabel)

    // 如果所有数据都是无效的，maxDigits可能是0，默认为3以便显示
    const displayDigits = maxDigits > 0 ? maxDigits : 3
    for (let i = 0; i < displayDigits; i++) {
        const th = document.createElement('th')
        th.textContent = `第${i + 1}位`
        headerRow.appendChild(th)
    }

    const thSpecialChar = document.createElement('th')
    thSpecialChar.textContent = '特殊字符'
    headerRow.appendChild(thSpecialChar)

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
            tdInvalid.colSpan = displayDigits + 4 // 合并剩余所有列
            tdInvalid.innerHTML = `<span class="error-message">数据格式错误: ${item.originalData}</span>`
            tdInvalid.style.textAlign = 'left'
            tdInvalid.style.paddingLeft = '15px'
            dataRow.appendChild(tdInvalid)
            tbody.appendChild(dataRow)
            return
        }

        for (let i = 0; i < displayDigits; i++) {
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

        // 添加特殊字符列
        const tdSpecialChar = document.createElement('td')
        const specialCharValue = item.specialChar || ''
        tdSpecialChar.textContent = specialCharValue
        if (specialCharValue) {
            tdSpecialChar.style.color = '#ff5722'
            tdSpecialChar.style.fontWeight = '600'
        }
        dataRow.appendChild(tdSpecialChar)

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

function clearAll() {
    document.getElementById('dataInput').value = ''
    document.getElementById('results').innerHTML = ''
    document.querySelector('input[name="hitNumber"][value="1"]').checked = true
}

// 复制结果到剪贴板
function copyResults() {
    if (!window.currentResults) {
        notification.warning('没有可复制的结果')
        return
    }

    const { processedData, calculatedResults } = window.currentResults

    // 构建复制文本 - 玩家视角（不取反）
    const lines = []
    processedData.forEach((item, index) => {
        const calcResult = calculatedResults[index]

        // 跳过错误或无效数据
        if (calcResult.error || item.isInvalid) {
            return
        }

        // 获取用户名，如果没有就使用序号
        const userName = item.label || `序号${index + 1}`

        // 玩家视角的值（不取反）
        const playerValue = calcResult.value

        lines.push(`${userName}：${playerValue.toFixed(2)}`)
    })

    const copyText = lines.join('\n')

    // 使用传统方法复制到剪贴板（兼容性更好）
    const textarea = document.createElement('textarea')
    textarea.value = copyText
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()

    try {
        const successful = document.execCommand('copy')
        if (successful) {
            notification.success('复制成功！')
        } else {
            notification.error('复制失败，请手动复制')
        }
    } catch (err) {
        console.error('复制失败:', err)
        notification.error('复制失败，请手动复制')
    } finally {
        document.body.removeChild(textarea)
    }
}