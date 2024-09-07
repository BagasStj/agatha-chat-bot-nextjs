import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from 'redis';

// Create a single pool instance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://default:mZekq7o6jnaQ@ep-empty-wind-a17chhot.ap-southeast-1.aws.neon.tech:5432/verceldb?sslmode=require'
});

// Create a single Redis client instance
const redisClient = createClient({
    url: process.env.REDIS_URL
});
redisClient.connect();

// Cache for Flowise AI responses
const responseCache = new Map();

export async function POST(req: NextRequest) {
    return handleWebhook(req);
}

export async function GET(req: NextRequest) {
    return handleWebhook(req);
}

async function handleWebhook(req: NextRequest) {
    const logId = uuidv4();
    const method = req.method;
    let sender, message: any;
    

    try {
        if (method === 'POST') {
            ({ sender, message } = await req.json());
        } else if (method === 'GET') {
            const params = new URL(req.url).searchParams;
            sender = params.get('sender');
            message = params.get('message');
        }

        // Log the incoming request asynchronously
        logApiCall(logId, method, sender, message).catch(console.error);

        if (!sender || !message) {
            return NextResponse.json({ success: false, error: 'Missing sender or message' }, { status: 400 });
        }

        const reply = await processMessage(sender, message, logId);
        return NextResponse.json({ success: true, reply });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

async function processMessage(sender: string, message: string, logId: string) {
    // Proses pesan Starting
    const greetings = ['hi', 'hello', 'hai', 'hallo', 'halo', 'selamatpagi', 'selamatsiang', 'selamatsore', 'selamatmalam', 'start'];
    const menuText = ['registrasirawatjalan', 'riwayatmedis', 'penjadwalankonsultasi', 'bpjsdanasuransi', 'pembayarandanpenagihan'];
    const promptGeneral_2 = 'You are an AI assistant who is highly skilled in providing medical information and knowledge about various disease conditions. You can only answer questions related to disease conditions, treatments, symptoms, causes, and relevant care. You cannot answer questions that are outside the scope of medical and health. Every question asked by a user about a disease condition will be recorded and stored in your memory, allowing you to refer to previous questions to provide more accurate and contextual answers to new related questions. \n Example of use: \n • Users can ask about symptoms, causes, or treatments of a disease. \n• You can provide information about preventive measures, self-care, or when to seek professional medical help. \n• You can explain the differences between commonly misunderstood conditions or provide general advice based on reliable medical knowledge. if there is a question that is not relevant, please provide the answer "sorry for now I can only answer about health or medical conditions. If you want to change the menu, please type `start`. Thank you" \n please answer in Indonesian';
    const promptGeneral_4 = `You are an AI assistant who is very knowledgeable in health insurance, including BPJS and various other types of health insurance. You can only answer questions related to information about BPJS, health insurance, service coverage, claim procedures, and available benefits. You cannot answer questions outside the scope of health insurance. Every question asked by a user regarding BPJS or health insurance will be recorded and stored in your memory, allowing you to refer to previous questions to provide more accurate and contextual answers to new related questions.\n\nExample of use:\n• Users can ask about the types of services covered by BPJS or certain health insurance.\n• You can provide information about the registration procedure for BPJS or other health insurance, including the terms and conditions.\n• You can explain the differences between BPJS and private health insurance, as well as the advantages and disadvantages of each.\n• You can provide guidance on how to file a claim, the required documents, and the insurance claim process.\n• You can answer questions about premium costs, coverage coverage, and how to choose health insurance that suits your needs.\nplease answer in Indonesian`

    if (greetings.some(greeting => message.toLowerCase().replace(/\s+/g, '').includes(greeting))) {
        await redisClient.del(sender);
        await redisClient.del(sender + "_menu");
        await redisClient.del(sender + "_nik");
        let reply = "Hai!👋 Saya adalah bot interaktif yang siap membantu Anda 😁. Silahkan pilih menu unutk mengakses fiture dari bot interaktif ini : \n \n   *1. Registrasi Rawat Jalan* \n   *2. Riwayat Medis*\n   *3. Penjadwalan Konsultasi*\n   *4. BPJS dan Asuransi* \n   *5. Pembayaran dan Penagihan*  \n \nAnda Hanya perlu menginputkan nomor menu atau ketik menu tersebut sebagai contoh  : \n\n `2` atau `Riwayat Medis`   \n \n  *Terimakasih* 🥰";
        await redisClient.set(sender, 'initial'); // Set message to initial
        await sendReply(sender, reply);
        await updateApiLog(logId, reply);
        return reply;
    }

    // Proses tanya  NIK
    if (message == '1' || message == '2' || message == '3' || message == '4' || message == '5' || menuText.some(menu => message.toLowerCase().replace(/\s+/g, '').includes(menu))) {
        let reply = "Anda telah memilih menu " + message + " \nTolong Inputkan NIK anda untuk mengakses fitur tersebut";
        await redisClient.set(sender, 'ask_nik');
        await redisClient.set(sender + "_menu", message);
        await sendReply(sender, reply);
        await updateApiLog(logId, reply);
        return reply;
    }

    // proses nik dan diolah berdasarkan menu yang di pilih
    const storedMessage = await getRedisValue(sender);
    const storedMenu = await getRedisValue(sender + "_menu");
    if (storedMessage == 'ask_nik') {
        // Registrasi rawat jalan
        if (storedMenu == '1' || storedMenu == 'registrasirawatjalan') {
            const response = await getCachedFlowiseAIResponse(`sebutkan nomor antrian, waktu registrasi, dan status dengan NIK ${message}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/d9f1c9f9-40af-4797-8428-a8e30dc4d504', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar atau belum melakukan registrasi rawat jalan 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await updateApiLog(logId, response.text);   
            await setRedisValue(sender, 'nik_done');
            await setRedisValue(sender + "_nik", message);
            return response.text;
        }

        // Riwayat medis
        if (storedMenu == '2' || storedMenu == 'riwayatmedis') {
            const response = await getCachedFlowiseAIResponse(`sebutkan biodata dan riwayat dari nik ${message}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/aa47ddaa-f368-499d-862e-fcab5ae194d4', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await updateApiLog(logId, response.text);
            await setRedisValue(sender, 'nik_done');
            await setRedisValue(sender + "_nik", message);
            return response.text;
        }

        // Penjadwalan konsultasi
        if (storedMenu == '3' || storedMenu == 'penjadwalankonsultasi') {
            const response = await getCachedFlowiseAIResponse(`dengan dokter siapa saya berkonsultasi jika nik saya ${message}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/f79aece0-4b19-4b3f-b18e-ab027b0565ff', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await updateApiLog(logId, response.text);   
            await setRedisValue(sender, 'nik_done');
            await setRedisValue(sender + "_nik", message);
            return response.text;
        }

        // BPJS dan Asuransi
        if (storedMenu == '4' || storedMenu == 'bpjsdanasuransi') {
            const response = await getCachedFlowiseAIResponse(`sebutkan biodata dan asuransi dari nik ${message}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/0d70067c-82ba-4dcb-ac87-7130306c1576', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await updateApiLog(logId, response.text);   
            await setRedisValue(sender, 'nik_done');
            await setRedisValue(sender + "_nik", message);
            return response.text;
        }

        // Pembayaran dan Penagihan
        if (storedMenu == '5' || storedMenu == 'pembayarandanpenagihan') {
            const response = await getCachedFlowiseAIResponse(`berapa total pembayaran saya jika nik saya ${message}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/b28deb38-fd23-42bc-be1d-f9a8e033a305', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await updateApiLog(logId, response.text);   
            await setRedisValue(sender, 'nik_done');
            await setRedisValue(sender + "_nik", message);
            return response.text;
        }
    }

    const storedNIK = await getRedisValue(sender + "_nik");
    // proses menanyakan berkelanjutan 
    if (storedMessage == 'nik_done') {
        // Registrasi rawat jalan
        if (storedMenu == '1' || storedMenu == 'registrasirawatjalan') {
            const response = await getCachedFlowiseAIResponse(`${message} jika nik saya ${storedNIK}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/d9f1c9f9-40af-4797-8428-a8e30dc4d504', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await updateApiLog(logId, response.text);   
            await setRedisValue(sender, 'nik_done');
            return response.text;
        }

        // Riwayat medis
        if (storedMenu == '2' || storedMenu == 'riwayatmedis') {
            const response = await getCachedFlowiseAIResponse(message, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/c6ff5c51-b0d5-4875-a994-463ed49f0b25', sender, promptGeneral_2);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                const response_general = await getCachedFlowiseAIResponse(message, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/c6ff5c51-b0d5-4875-a994-463ed49f0b25', sender, promptGeneral_2);
                await sendReply(sender, response_general.text);
                return response_general.text;
            }
            await sendReply(sender, response.text);
            await setRedisValue(sender, 'nik_done');
            await updateApiLog(logId, response.text);   
            return response.text;
        }

        // Penjadwalan konsultasi
        if (storedMenu == '3' || storedMenu == 'penjadwalankonsultasi') {
            const response = await getCachedFlowiseAIResponse(`${message} jika nik saya ${storedNIK}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/f79aece0-4b19-4b3f-b18e-ab027b0565ff', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await setRedisValue(sender, 'nik_done');
            await updateApiLog(logId, response.text);   
            return response.text;
        }

        // BPJS dan Asuransi
        if (storedMenu == '4' || storedMenu == 'bpjsdanasuransi') {
            const response = await getCachedFlowiseAIResponse(message, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/c6ff5c51-b0d5-4875-a994-463ed49f0b25', sender, promptGeneral_4);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                const response_general = await getCachedFlowiseAIResponse(message, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/c6ff5c51-b0d5-4875-a994-463ed49f0b25', sender, promptGeneral_4);
                await sendReply(sender, response_general.text);
                return response_general.text;
            }
            await sendReply(sender, response.text);
            await setRedisValue(sender, 'nik_done');
            await updateApiLog(logId, response.text);   
            return response.text;
        }

        // Pembayaran dan Penagihan
        if (storedMenu == '5' || storedMenu == 'pembayarandanpenagihan') {
            const response = await getCachedFlowiseAIResponse(`${message} jika nik saya ${storedNIK}`, 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/b28deb38-fd23-42bc-be1d-f9a8e033a305', sender);
            if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                return response.text;
            }
            await sendReply(sender, response.text);
            await setRedisValue(sender, 'nik_done');
            await updateApiLog(logId, response.text);   
            return response.text;
        }
    }

    const sendReplyResponse = await sendReply(sender, 'maaf , mungkin anda salah pilih menu , silahkan ketik `start` untuk memulai ulang');
    return sendReplyResponse;
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

// Helper functions
async function getRedisValue(key: string) {
    return await redisClient.get(key);
}

async function setRedisValue(key: string, value: string) {
    await redisClient.set(key, value);
}

async function getCachedFlowiseAIResponse(input: string, url: string, sessionid: string, systemMessagePrompt?: string) {
    const cacheKey = `${url}:${input}:${sessionid}`;
    if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey);
    }

    const response = await flowiseAIRequest(input, url, sessionid, systemMessagePrompt);
    responseCache.set(cacheKey, response);
    return response;
}

async function flowiseAIRequest(input: string, url: string, sessionid: string, systemMessagePrompt?: string) {
    const body: any = {
        question: input,
        chatId: `${sessionid}-${url.slice(-8)}`,
    };
    if (systemMessagePrompt) {
        body.overrideConfig = { systemMessagePrompt };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    return response.json();
}

async function logApiCall(id: string, method: string, sender: string | null, message: string | null) {
    try {
        const client = await pool.connect();
        const query = 'INSERT INTO public."ApiLog" (id, method, sender, message) VALUES ($1, $2, $3, $4)';
        await client.query(query, [id, method, sender, message]);
        client.release();
    } catch (dbError) {
        console.error('Error logging API call:', dbError);
    }
}

async function updateApiLog(id: string, response: string) {
    try {
        const client = await pool.connect();
        const query = 'UPDATE public."ApiLog" SET response = $1 WHERE id = $2';
        await client.query(query, [response, id]);
        client.release();
    } catch (dbError) {
        console.error('Error updating API log:', dbError);
    }
}
