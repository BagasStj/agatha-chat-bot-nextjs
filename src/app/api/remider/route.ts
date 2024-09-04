import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface AntrianPayload {
  id: number;
  username: string;
  nik: string;
  nomor_hp: string;
  no_antrian: string;
  date: string;
}

async function checkForChanges() {
  const client = await pool.connect();
  try {
    // Ambil data yang belum diproses
    const result = await client.query('SELECT * FROM "SampleDataNomorAntrian" WHERE processed = false LIMIT 10');
    
    for (const row of result.rows) {
      const payload: AntrianPayload = row;
      const message = `Halo ${payload.username}, nomor antrian Anda: ${payload.no_antrian} untuk tanggal ${payload.date}.`;
      await sendReply(payload.nomor_hp, message);
      
      // Tandai data sebagai sudah diproses
      await client.query('UPDATE "SampleDataNomorAntrian" SET processed = true WHERE id = $1', [row.id]);
    }

    return result.rowCount;
  } finally {
    client.release();
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  // Pastikan request memiliki secret yang valid
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processedCount = await checkForChanges();
    return NextResponse.json({ status: 'Success', processedCount });
  } catch (error) {
    console.error('Error checking for changes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function sendReply(to: string, message: string) {
    const url = 'https://api.fonnte.com/send';
    const token = process.env.FONNTE_TOKEN;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': token || '',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            target: to,
            message: message,
        }),
    });

    return response.json();
}