import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Create a new pool
const pool = new Pool({
    connectionString: 'postgresql://postgres:TNWMMiYGBJWmmBTjGfAWZXQhuzguPMDH@autorack.proxy.rlwy.net:45266/railway'
});

export async function saveMessage(sender: string, message: string) {
    try {
        const client = await pool.connect();
        const query = 'INSERT INTO public.message (id, sender, message) VALUES ($1, $2, $3)';
        const id = uuidv4(); // Generate a UUID for the id field
        await client.query(query, [id, sender, message]);
        client.release();
    } catch (dbError) {
        console.error('Error saving to database:', dbError);
        throw dbError;
    }
}