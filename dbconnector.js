// dbconnector.js

import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config(); // Carga las variables de entorno desde el archivo .env

const config = {
    host: process.env.DB_HOST,          // '127.0.0.1'
    user: process.env.DB_USER,          // 'root'
    password: process.env.DB_PASSWORD,  // ''
    database: process.env.DB_DATABASE,  // 'sockets'
    port: Number(process.env.DB_PORT),  // 3308
};

class DBConnector {
    dbconnector = mariadb.createPool(config);

    async query(queryString, params = []) {
        let conn;
        try {
            conn = await this.dbconnector.getConnection();
            const data = await conn.query(queryString, params);
            console.log('Query Result:', data);
            return data;
        } catch (err) {
            console.error('Database Error:', err);
            throw err;
        } finally {
            if (conn) conn.end();
        }
    }
}

export default new DBConnector();
