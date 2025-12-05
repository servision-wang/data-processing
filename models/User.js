const db = require('../config/database')
const bcrypt = require('bcryptjs')

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
}

module.exports = User
