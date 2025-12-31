// 自定义通知组件

class Notification {
    constructor() {
        this.container = null
        this.init()
    }

    init() {
        // 创建通知容器
        this.container = document.createElement('div')
        this.container.id = 'notification-container'
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `
        document.body.appendChild(this.container)

        // 添加样式
        this.addStyles()
    }

    addStyles() {
        const style = document.createElement('style')
        style.textContent = `
            .notification-item {
                background: white;
                border-radius: 12px;
                padding: 16px 20px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 320px;
                max-width: 420px;
                pointer-events: auto;
                animation: slideIn 0.3s ease;
                border-left: 4px solid;
                opacity: 1;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            .notification-item.success {
                border-left-color: #4CAF50;
            }

            .notification-item.error {
                border-left-color: #f44336;
            }

            .notification-item.warning {
                border-left-color: #ff9800;
            }

            .notification-item.info {
                border-left-color: #2196F3;
            }

            .notification-icon {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 14px;
                font-weight: bold;
            }

            .notification-item.success .notification-icon {
                background: #4CAF50;
                color: white;
            }

            .notification-item.error .notification-icon {
                background: #f44336;
                color: white;
            }

            .notification-item.warning .notification-icon {
                background: #ff9800;
                color: white;
            }

            .notification-item.info .notification-icon {
                background: #2196F3;
                color: white;
            }

            .notification-content {
                flex: 1;
                font-size: 14px;
                color: #333;
                line-height: 1.5;
            }

            .notification-close {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: none;
                background: #f0f0f0;
                color: #666;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.2s;
            }

            .notification-close:hover {
                background: #e0e0e0;
                color: #333;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }

            .notification-item.removing {
                opacity: 0;
                transform: translateX(100px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            /* 确认对话框样式 */
            .confirm-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(3px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }

            .confirm-dialog {
                background: white;
                border-radius: 16px;
                padding: 24px;
                min-width: 360px;
                max-width: 480px;
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
                animation: scaleIn 0.3s ease;
            }

            .confirm-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }

            .confirm-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                background: #ff9800;
                color: white;
            }

            .confirm-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }

            .confirm-message {
                font-size: 14px;
                color: #666;
                line-height: 1.6;
                margin-bottom: 24px;
                padding-left: 44px;
            }

            .confirm-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .confirm-btn {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .confirm-btn-cancel {
                background: #e0e0e0;
                color: #666;
            }

            .confirm-btn-cancel:hover {
                background: #d0d0d0;
            }

            .confirm-btn-confirm {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .confirm-btn-confirm:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        `
        document.head.appendChild(style)
    }

    show(message, type = 'info', duration = 3000) {
        const item = document.createElement('div')
        item.className = `notification-item ${type}`

        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        }

        item.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">${message}</div>
            <button class="notification-close">×</button>
        `

        this.container.appendChild(item)

        // 强制重排，确保初始状态被应用
        item.offsetHeight

        // 关闭按钮
        const closeBtn = item.querySelector('.notification-close')
        closeBtn.addEventListener('click', () => this.remove(item))

        // 自动关闭
        if (duration > 0) {
            item.autoCloseTimeout = setTimeout(() => this.remove(item), duration)
        }

        return item
    }

    remove(item) {
        // 清除自动关闭定时器
        if (item.autoCloseTimeout) {
            clearTimeout(item.autoCloseTimeout)
        }

        // 添加移除类触发过渡动画
        item.classList.add('removing')
        
        // 等待动画完成后再从DOM中移除
        setTimeout(() => {
            if (item.parentNode) {
                item.parentNode.removeChild(item)
            }
        }, 300)
    }

    success(message, duration = 3000) {
        return this.show(message, 'success', duration)
    }

    error(message, duration = 4000) {
        return this.show(message, 'error', duration)
    }

    warning(message, duration = 3500) {
        return this.show(message, 'warning', duration)
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration)
    }

    confirm(message, title = '确认操作') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div')
            overlay.className = 'confirm-overlay'

            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-header">
                        <div class="confirm-icon">?</div>
                        <div class="confirm-title">${title}</div>
                    </div>
                    <div class="confirm-message">${message}</div>
                    <div class="confirm-buttons">
                        <button class="confirm-btn confirm-btn-cancel">取消</button>
                        <button class="confirm-btn confirm-btn-confirm">确定</button>
                    </div>
                </div>
            `

            document.body.appendChild(overlay)

            const dialog = overlay.querySelector('.confirm-dialog')
            const cancelBtn = overlay.querySelector('.confirm-btn-cancel')
            const confirmBtn = overlay.querySelector('.confirm-btn-confirm')

            const cleanup = () => {
                overlay.style.animation = 'fadeIn 0.2s ease reverse'
                setTimeout(() => {
                    document.body.removeChild(overlay)
                }, 200)
            }

            cancelBtn.addEventListener('click', () => {
                cleanup()
                resolve(false)
            })

            confirmBtn.addEventListener('click', () => {
                cleanup()
                resolve(true)
            })

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup()
                    resolve(false)
                }
            })
        })
    }
}

// 创建全局实例
const notification = new Notification()

// 兼容旧的 alert 方法
window.showNotification = (message, type = 'info') => {
    notification.show(message, type)
}

window.showConfirm = (message, title) => {
    return notification.confirm(message, title)
}
