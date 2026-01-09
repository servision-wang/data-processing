const db = require('../config/database')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

// 读取配置
function getConfig() {
    const configPath = path.join(__dirname, '../data/config.json')
    const configData = fs.readFileSync(configPath, 'utf8')
    return JSON.parse(configData)
}

class User {
    static async findByUsername(username) {
        const pool = db.getPool()
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
        return rows[0]
    }

    static async findById(id) {
        const pool = db.getPool()
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id])
        return rows[0]
    }

    static async create(username, password, isAdmin = false, expiryDate = null) {
        const pool = db.getPool()
        const hashedPassword = await bcrypt.hash(password, 10)
        const [result] = await pool.query(
            'INSERT INTO users (username, password, is_admin, expiry_date) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, isAdmin, expiryDate]
        )
        return result.insertId
    }

    static async update(id, data) {
        const pool = db.getPool()
        const updates = []
        const values = []

        if (data.password) {
            updates.push('password = ?')
            values.push(await bcrypt.hash(data.password, 10))
        }

        if (data.expiryDate !== undefined) {
            updates.push('expiry_date = ?')
            values.push(data.expiryDate)
        }

        if (updates.length === 0) return

        values.push(id)
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        )
    }

    static async delete(id) {
        const pool = db.getPool()
        await pool.query('DELETE FROM users WHERE id = ? AND is_admin = FALSE', [id])
    }

    static async getAll() {
        const pool = db.getPool()
        const [rows] = await pool.query('SELECT id, username, is_admin, expiry_date, created_at FROM users ORDER BY created_at DESC')
        return rows
    }

    static async comparePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword)
    }

    static isExpired(user) {
        if (!user.expiry_date) return false
        return new Date(user.expiry_date) < new Date()
    }

    // 获取用户当前活跃的登录IP列表
    static async getActiveLoginIPs(userId) {
        const pool = db.getPool()
        // 获取最近24小时内活跃的IP
        const [rows] = await pool.query(
            'SELECT DISTINCT ip_address FROM login_sessions WHERE user_id = ? AND last_activity > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
            [userId]
        )
        return rows.map(row => row.ip_address)
    }

    // 检查IP登录数量是否超限，超限则自动踢掉最早的会话
    static async checkIPLimit(userId, currentIP) {
        const config = getConfig()
        const maxLoginIPs = config.maxLoginIPs || 2
        const pool = db.getPool()

        // 获取最近24小时内活跃的会话（包含完整信息）
        const [sessions] = await pool.query(
            'SELECT id, ip_address, session_id, last_activity FROM login_sessions WHERE user_id = ? AND last_activity > DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY last_activity ASC',
            [userId]
        )

        // 如果当前IP已经在活跃列表中，允许登录
        const existingSession = sessions.find(s => s.ip_address === currentIP)
        if (existingSession) {
            console.log(`用户 ${userId} 的 IP ${currentIP} 已存在，允许登录`)
            return { allowed: true, existingSession: true }
        }

        // 如果活跃IP数量未达到上限，允许登录
        if (sessions.length < maxLoginIPs) {
            console.log(`用户 ${userId} 当前活跃IP数量: ${sessions.length}/${maxLoginIPs}，允许新IP ${currentIP} 登录`)
            return { allowed: true }
        }

        // 超过限制，自动踢掉最早的会话（按 last_activity 排序，第一个是最早的）
        const oldestSession = sessions[0]
        await pool.query('DELETE FROM login_sessions WHERE id = ?', [oldestSession.id])

        console.log(`用户 ${userId} 登录IP数量已满 (${sessions.length}/${maxLoginIPs})，自动踢掉最早的会话 ID:${oldestSession.id} (IP: ${oldestSession.ip_address})`)

        return {
            allowed: true,
            kickedOldest: true,
            kickedIP: oldestSession.ip_address,
            kickedSessionId: oldestSession.id
        }
    }

    // 记录或更新登录会话
    static async recordLoginSession(userId, ipAddress, sessionId) {
        const pool = db.getPool()

        // 先检查该用户的该IP是否已有会话记录
        const [existing] = await pool.query(
            'SELECT id, session_id FROM login_sessions WHERE user_id = ? AND ip_address = ?',
            [userId, ipAddress]
        )

        if (existing.length > 0) {
            // 更新现有会话
            console.log(`更新用户 ${userId} IP ${ipAddress} 的会话记录`)
            await pool.query(
                'UPDATE login_sessions SET session_id = ?, last_activity = NOW() WHERE user_id = ? AND ip_address = ?',
                [sessionId, userId, ipAddress]
            )
        } else {
            // 创建新会话前，再次确认是否需要清理（双重保险）
            const config = getConfig()
            const maxLoginIPs = config.maxLoginIPs || 2

            const [allSessions] = await pool.query(
                'SELECT id, ip_address FROM login_sessions WHERE user_id = ? ORDER BY last_activity ASC',
                [userId]
            )

            // 如果当前会话数已达上限，删除最早的
            while (allSessions.length >= maxLoginIPs) {
                const oldestSession = allSessions.shift()
                console.log(`创建新会话前清理：删除用户 ${userId} 的旧会话 ID:${oldestSession.id} (IP: ${oldestSession.ip_address})`)
                await pool.query('DELETE FROM login_sessions WHERE id = ?', [oldestSession.id])
            }

            // 创建新会话
            console.log(`创建用户 ${userId} IP ${ipAddress} 的新会话记录`)
            await pool.query(
                'INSERT INTO login_sessions (user_id, ip_address, session_id, last_activity) VALUES (?, ?, ?, NOW())',
                [userId, ipAddress, sessionId]
            )
        }
    }

    // 更新会话活跃时间
    static async updateSessionActivity(sessionId) {
        const pool = db.getPool()
        await pool.query(
            'UPDATE login_sessions SET last_activity = NOW() WHERE session_id = ?',
            [sessionId]
        )
    }

    // 删除登录会话
    static async removeLoginSession(sessionId) {
        const pool = db.getPool()
        await pool.query('DELETE FROM login_sessions WHERE session_id = ?', [sessionId])
    }

    // 清理过期会话（超过24小时）
    static async cleanExpiredSessions() {
        const pool = db.getPool()
        await pool.query(
            'DELETE FROM login_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR)'
        )
    }

    // 获取用户的所有活跃会话信息
    static async getUserActiveSessions(userId) {
        const pool = db.getPool()
        const [rows] = await pool.query(
            'SELECT ip_address, last_activity, created_at FROM login_sessions WHERE user_id = ? AND last_activity > DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY last_activity DESC',
            [userId]
        )
        return rows
    }
}

module.exports = User
