
import { Pool } from 'pg';

// Using the IPv6 address resolved from nslookup
const connectionString = 'postgresql://postgres:VicEmiLor16102002gina%40@[2600:1f18:2e13:9d18:38f9:ae08:e68c:e0ba]:5432/postgres?sslmode=no-verify';

console.log('Testing connection to IPv6 address...');

const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect()
    .then(client => {
        console.log('Successfully connected to IPv6!');
        return client.query('SELECT NOW()')
            .then(res => {
                console.log('Query result:', res.rows[0]);
                client.release();
                pool.end();
            });
    })
    .catch(err => {
        console.error('Connection error:', err);
        pool.end();
    });
