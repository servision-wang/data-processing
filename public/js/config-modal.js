// 配置弹窗管理

function openConfigModal() {
    const modal = document.getElementById('configModal')
    modal.style.display = 'flex'

    // 确保 currentConfig 已加载
    if (typeof currentConfig === 'undefined') {
        console.error('配置未加载')
        return
    }

    // 回显当前配置
    document.getElementById('specialChars').value = currentConfig.specialChars.join(',')
    renderDeductionRules()
}

function closeConfigModal() {
    const modal = document.getElementById('configModal')
    modal.style.display = 'none'
}

function renderDeductionRules() {
    const container = document.getElementById('deductionRulesContainer')
    container.innerHTML = ''

    currentConfig.deductionRules.forEach((rule, index) => {
        const ruleDiv = document.createElement('div')
        ruleDiv.className = 'rule-item'

        const hasIncrement = rule.increment && rule.interval

        ruleDiv.innerHTML = `
            <div class="rule-inputs">
                <input type="number" class="rule-min" value="${rule.min}" placeholder="最小值">
                <span>-</span>
                <input type="number" class="rule-max" value="${rule.max === Infinity ? '' : rule.max}" placeholder="最大值(无限填空)">
                <span>扣减:</span>
                <input type="number" class="rule-deduction" value="${rule.deduction}" placeholder="扣减金额">
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="checkbox" class="rule-has-increment" ${hasIncrement ? 'checked' : ''} onchange="toggleIncrement(${index})">
                    <span>递增规则</span>
                </label>
                <button onclick="removeRule(${index})" class="btn-remove">删除</button>
                <div class="increment-inputs" style="display: ${hasIncrement ? 'flex' : 'none'}; gap: 10px; align-items: center;">
                    <span>递增:</span>
                    <input type="number" class="rule-increment" value="${rule.increment || ''}" placeholder="递增值">
                    <span>间隔:</span>
                    <input type="number" class="rule-interval" value="${rule.interval || ''}" placeholder="间隔">
                </div>
                
            </div>
        `
        container.appendChild(ruleDiv)
    })
}

function toggleIncrement(index) {
    const ruleItems = document.querySelectorAll('.rule-item')
    const ruleItem = ruleItems[index]
    const checkbox = ruleItem.querySelector('.rule-has-increment')
    const incrementInputs = ruleItem.querySelector('.increment-inputs')

    if (checkbox.checked) {
        incrementInputs.style.display = 'flex'
    } else {
        incrementInputs.style.display = 'none'
    }
}

function addRule() {
    currentConfig.deductionRules.push({
        min: 0,
        max: 100,
        deduction: 0
    })
    renderDeductionRules()
}

async function removeRule(index) {
    const confirmed = await notification.confirm('确定要删除这条规则吗？', '删除规则')
    if (confirmed) {
        currentConfig.deductionRules.splice(index, 1)
        renderDeductionRules()
    }
}

function validateRules(rules) {
    // 按最小值排序
    const sortedRules = [...rules].sort((a, b) => a.min - b.min)

    for (let i = 0; i < sortedRules.length; i++) {
        const rule = sortedRules[i]

        // 检查基本有效性
        if (rule.min < 0) {
            return { valid: false, message: `第${i + 1}条规则的最小值不能为负数` }
        }

        if (rule.max !== Infinity && rule.max < rule.min) {
            return { valid: false, message: `第${i + 1}条规则的最大值不能小于最小值` }
        }

        if (rule.deduction < 0) {
            return { valid: false, message: `第${i + 1}条规则的扣减金额不能为负数` }
        }

        // 检查递增规则的有效性
        if (rule.increment || rule.interval) {
            if (!rule.increment || !rule.interval) {
                return { valid: false, message: `第${i + 1}条规则的递增设置不完整` }
            }
            if (rule.increment <= 0 || rule.interval <= 0) {
                return { valid: false, message: `第${i + 1}条规则的递增值和间隔必须大于0` }
            }
        }

        // 检查是否有间隙或重叠
        if (i < sortedRules.length - 1) {
            const nextRule = sortedRules[i + 1]
            if (rule.max !== Infinity && rule.max + 1 < nextRule.min) {
                return { valid: false, message: `第${i + 1}条和第${i + 2}条规则之间存在间隙` }
            }
            if (rule.max !== Infinity && rule.max >= nextRule.min) {
                return { valid: false, message: `第${i + 1}条和第${i + 2}条规则存在重叠` }
            }
        }
    }

    return { valid: true }
}

async function saveConfigModal() {
    // 收集特殊字符 - 支持中英文逗号分隔
    const specialCharsInput = document.getElementById('specialChars').value.trim()
    const specialChars = specialCharsInput ? specialCharsInput.split(/[,，]/).map(s => s.trim()).filter(s => s) : []

    // 收集扣减规则
    const ruleItems = document.querySelectorAll('.rule-item')
    const deductionRules = []

    ruleItems.forEach((item) => {
        const min = parseInt(item.querySelector('.rule-min').value)
        const maxInput = item.querySelector('.rule-max').value
        const max = maxInput === '' ? Infinity : parseInt(maxInput)
        const deduction = parseInt(item.querySelector('.rule-deduction').value)
        const hasIncrement = item.querySelector('.rule-has-increment').checked

        const rule = { min, max, deduction }

        if (hasIncrement) {
            const increment = parseInt(item.querySelector('.rule-increment').value)
            const interval = parseInt(item.querySelector('.rule-interval').value)
            if (!isNaN(increment) && !isNaN(interval)) {
                rule.increment = increment
                rule.interval = interval
            }
        }

        deductionRules.push(rule)
    })

    // 验证规则
    const validation = validateRules(deductionRules)
    if (!validation.valid) {
        notification.error(validation.message)
        return
    }

    // 构建新配置
    const newConfig = {
        specialChars,
        deductionRules
    }

    // 保存到服务器
    const result = await saveConfig(newConfig)

    if (result.success) {
        currentConfig = newConfig
        notification.success('保存成功！')
        closeConfigModal()
    } else {
        notification.error('保存失败: ' + (result.message || '未知错误'))
    }
}

async function resetToDefault() {
    const confirmed = await notification.confirm('确定要恢复默认设置吗？所有自定义配置将被清除。', '恢复默认设置')
    if (confirmed) {
        currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
        document.getElementById('specialChars').value = currentConfig.specialChars.join(',')
        renderDeductionRules()
        notification.success('已恢复默认设置')
    }
}
