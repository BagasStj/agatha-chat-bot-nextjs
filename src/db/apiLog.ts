import { Pool } from 'pg';

// Create a new pool
const pool = new Pool({
    connectionString: 'postgresql://postgres:TNWMMiYGBJWmmBTjGfAWZXQhuzguPMDH@autorack.proxy.rlwy.net:45266/railway'
});

export async function logApiCall(id: string, method: string, sender: string | null, message: string | null) {
    try {
        const client = await pool.connect();
        const query = 'INSERT INTO public.apilog (id, "method" , sender, message) VALUES ($1, $2, $3, $4)';
        await client.query(query, [id, method, sender, message]);
        client.release();
    } catch (dbError) {
        console.error('Error logging API call:', dbError);
        throw dbError;
    }
}

export async function updateApiLog(id: string, response: string) {
    try {
        const client = await pool.connect();
        const query = 'UPDATE public.apilog  SET response = $1 WHERE id = $2';
        console.log('Update API log:', query);
        await client.query(query, [response, id]);
        client.release();
    } catch (dbError) {
        console.error('Error updating API log:', dbError);
        throw dbError;
    }
}