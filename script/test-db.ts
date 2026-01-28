
import { Pool } from 'pg';

const connectionString = 'postgresql://postgres.ikcqewjqtqqnyuzmmhwe:VicEmiLor1610gina%40@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

console.log('Testing connection to:', connectionString.replace(/:[^:@]*@/, ':****@'));

const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
});

pool.connect()
    .then(client => {
        console.log('Successfully connected!');
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
