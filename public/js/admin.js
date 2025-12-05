// 管理页面的 JavaScript 功能

function showEditModal(userId, username, expiryDate) {
    const modal = document.getElementById('editModal')
    const form = document.getElementById('editForm')

    // 设置表单 action
    form.action = `/admin/users/${userId}`

    // 填充表单数据
    document.getElementById('editUsername').value = username
    document.getElementById('editPassword').value = ''

    // 计算当前有效期对应的月份选项（如果有的话）
    const select = document.getElementById('editExpiryPeriod')
    select.value = '' // 默认永久

    if (expiryDate) {
        const expiry = new Date(expiryDate)
        const now = new Date()
        const monthsDiff = Math.round((expiry - now) / (1000 * 60 * 60 * 24 * 30))

        // 如果是接近标准月份，自动选择
        if (monthsDiff >= 1 && monthsDiff <= 2) select.value = '1'
        else if (monthsDiff >= 3 && monthsDiff <= 4) select.value = '3'
        else if (monthsDiff >= 5 && monthsDiff <= 7) select.value = '6'
        else if (monthsDiff >= 10 && monthsDiff <= 14) select.value = '12'
    }

    // 显示模态框
    modal.style.display = 'block'
}

function closeEditModal() {
    const modal = document.getElementById('editModal')
    modal.style.display = 'none'
}

// 点击模态框外部关闭
window.onclick = function (event) {
    const modal = document.getElementById('editModal')
    if (event.target === modal) {
        closeEditModal()
    }
}
