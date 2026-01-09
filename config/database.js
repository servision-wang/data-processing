const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')

let pool

async function createConnection() {
    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306
    })
}

async function initialize() {
    try {
        // 创建数据库连接（不指定数据库）
        const connection = await createConnection()

        // 创建数据库
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'data_tool_db'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
        await connection.end()

        // 创建连接池
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'data_tool_db',
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        })

        // 创建用户表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                expiry_date DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_expiry_date (expiry_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `)

        // 创建登录会话表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                session_id VARCHAR(255) NOT NULL,
                last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_session_id (session_id),
                INDEX idx_last_activity (last_activity)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `)

        console.log('数据库表初始化成功')

        // 检查是否存在管理员账号
        const [adminUsers] = await pool.query('SELECT * FROM users WHERE is_admin = TRUE LIMIT 1')

        if (adminUsers.length === 0) {
            // 创建默认管理员账号
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10)
            await pool.query(
                'INSERT INTO users (username, password, is_admin) VALUES (?, ?, TRUE)',
                [process.env.ADMIN_USERNAME || 'admin', hashedPassword]
            )
            console.log('已创建默认管理员账号')
        }

        return pool
    } catch (error) {
        console.error('数据库初始化失败:', error)
        throw error
    }
}

function getPool() {
    if (!pool) {
        throw new Error('数据库连接池未初始化')
    }
    return pool
}

module.exports = {
    initialize,
    getPool
}
