import redisClient from '@/lib/redisClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return handleWebhook(req);
}

export async function GET(req: NextRequest) {
    return handleWebhook(req);
}

async function handleWebhook(req: NextRequest) {
    try {

        let sender, message: any;


        if (req.method === 'POST') {
            const body = await req.json();
            ({ sender, message } = body);
        } else if (req.method === 'GET') {
            const params = new URL(req.url).searchParams;
            sender = params.get('sender');
            message = params.get('message');
        }

        const systemMessagePrompt2 = 'You are an AI assistant who is highly skilled in providing medical information and knowledge about various disease conditions. You can only answer questions related to disease conditions, treatments, symptoms, causes, and relevant care. You cannot answer questions that are outside the scope of medical and health. Every question asked by a user about a disease condition will be recorded and stored in your memory, allowing you to refer to previous questions to provide more accurate and contextual answers to new related questions. \n Example of use: \n • Users can ask about symptoms, causes, or treatments of a disease. \n• You can provide information about preventive measures, self-care, or when to seek professional medical help. \n• You can explain the differences between commonly misunderstood conditions or provide general advice based on reliable medical knowledge. if there is a question that is not relevant, please provide the answer "sorry for now I can only answer about health or medical conditions. If you want to change the menu, please type `start`. Thank you" \n please answer in Indonesian';
        const ststemMessagePrompt4 = `You are an AI assistant who is very knowledgeable in health insurance, including BPJS and various other types of health insurance. You can only answer questions related to information about BPJS, health insurance, service coverage, claim procedures, and available benefits. You cannot answer questions outside the scope of health insurance. Every question asked by a user regarding BPJS or health insurance will be recorded and stored in your memory, allowing you to refer to previous questions to provide more accurate and contextual answers to new related questions.\n\nExample of use:\n• Users can ask about the types of services covered by BPJS or certain health insurance.\n• You can provide information about the registration procedure for BPJS or other health insurance, including the terms and conditions.\n• You can explain the differences between BPJS and private health insurance, as well as the advantages and disadvantages of each.\n• You can provide guidance on how to file a claim, the required documents, and the insurance claim process.\n• You can answer questions about premium costs, coverage coverage, and how to choose health insurance that suits your needs.\nplease answer in Indonesian`


        console.log('Pesan diterima:', { sender, message });
        const greetings = ['hi', 'hello', 'hai', 'hallo', 'halo', 'selamatpagi', 'selamatsiang', 'selamatsore', 'selamatmalam', 'start'];
        const menuText = ['registrasirawatjalan', 'riwayatmedis', 'penjadwalankonsultasi', 'bpjsdanasuransi', 'pembayarandanpenagihan'];

        if (message != null && sender != null) {
            // Proses pesan Starting
            if (greetings.some(greeting => message.toLowerCase().replace(/\s+/g, '').includes(greeting))) {
                await redisClient.del(sender);
                await redisClient.del(sender + "_menu");
                await redisClient.del(sender + "_nik");
                let reply = "Hai!👋 Saya adalah bot interaktif yang siap membantu Anda 😁. Silahkan pilih menu unutk mengakses fiture dari bot interaktif ini : \n \n   *1. Registrasi Rawat Jalan* \n   *2. Riwayat Medis*\n   *3. Penjadwalan Konsultasi*\n   *4. BPJS dan Asuransi* \n   *5. Pembayaran dan Penagihan*  \n \nAnda Hanya perlu menginputkan nomor menu atau ketik menu tersebut sebagai contoh  : \n\n `2` atau `Riwayat Medis`   \n \n  *Terimakasih* 🥰";
                await redisClient.set(sender, 'initial'); // Set message to initial
                console.log('Set message to initial for sender:', sender);
                await sendReply(sender, reply);
                return NextResponse.json({
                    success: true,
                    reply: reply
                });
            }

            // Proses Input NIK
            if (message == '1' || message == '2' || message == '3' || message == '4' || message == '5' || menuText.some(menu => message.toLowerCase().replace(/\s+/g, '').includes(menu))) {
                let reply = "Anda telah memilih menu " + message + " \nTolong Inputkan NIK anda untuk mengakses fitur tersebut";
                await redisClient.set(sender, 'nik_done');
                await redisClient.set(sender + "_menu", message);
                console.log('Set message to nik_done for sender:', sender);
                await sendReply(sender, reply);
                return NextResponse.json({
                    success: true,
                    reply: reply
                });
            }

            const storedMessage = await redisClient.get(sender);
            const storedMenu = await redisClient.get(sender + "_menu");

            // Registrasi rawat jalan
            if (storedMessage == 'nik_done' && (storedMenu == '1' || storedMenu == 'registrasirawatjalan')) {
                // const systemMessagePrompt = 'Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. \n You can sort the results by relevant columns to return the most interesting examples in the database. \n if there is a question "sebutkan nomor antrean , waktu daftar , dan status dengan nik 1001", then answer with an example "berdasarkan nik 1001 , nomor antran anda adalah 2 dengan waktu daftar 2024-09-01 07:30:00.000 dan status terdaftar" . If the question relates to information that is not in this database, answer with "No results found in the database."\n   if there is a question "dengan dokter siapa yang harus saya temui jika nik saya 1002", then answer with an example "Anda harus bertemu dengan Dokter Jane Smith. di jam 08:00:00 sampai 12:00:00" . If the question relates to information that is not in this database, answer with "No results found in the database."  \n  Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. \n Also pay attention to which columns are in which tables.Please answer in Indonesian   Use the following format: \n Question: "Question here" \n SQLQuery: "SQL query to be executed" \n  SQLResult: "Result of SQLQuery \n "Answer: "Final answer here" \n Use only the tables listed below. {table_info} \n Question: {input}'
                const systemMessagePrompt = `
                    Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                        The data provided are user data, registration queue, polyclinic, doctor, and doctor's schedule. Each data is related to each other. if the user asks about a doctor, then answer with something related to what the user has given

                        If there is a question "sebutkan nomor antrian, waktu registrasi, dan status dengan NIK 1001", then answer with an example "berdasarkan NIK 1001 atas nama Jhon Doe, nomor antrian Anda adalah 2 dengan waktu registrasi 2024-09-01 07:30 dengan status registrasi terdaftar. " If the question is related to information that is not in this database, answer with "No results found in the database."

                        please answer in detail and in detail according to the data provided, use another column to add your explanation, for example if there is a question "dengan deokter siapa saya harus bertemu jika nik saya 1002", then answer with an example "berdasarkan NIK 1002 atas nama Bagas Setiaji, sebaiknya Anda bertemu dengan drg. Jane Smith di Klinik Gigi, Anda dapat datang ke Area B - Gedung Rawat Inap" If the question relates to information that is not in this database, answer with "No results found in the database."

                        Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                        Please answer in Indonesian

                        Use the following format:

                        Question: "Question here"

                        SQLQuery: "SQL query to be executed"

                        SQLResult: "Result of SQLQuery"

                        Answer: "Final answer here"

                        Use only the tables listed below.

                        {table_info}

                        Question: {input}
                `
                const response = await flowiseAI_1_3_5(message, systemMessagePrompt, 'pengguna,janji_temu,poli,dokter,jadwal_dokter,antrean_pendaftaran,area_rs', `sebutkan nomor antrean , waktu daftar , dan status dengan nik ${message}`, sender);
                console.log('Response flow 1:', response);
                if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                    await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar atau belum melakukan registrasi rawat jalan 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                    return NextResponse.json({
                        success: true,
                        reply: response
                    });
                }
                await redisClient.set(sender, 'biodata_done');
                await redisClient.set(sender + "_nik", message);
                console.log('Set message to biodata_done for sender:', sender);
                await sendReply(sender, response.text);
                await sendReply(sender, 'Anda dapat menanyakan seputar antrean pendaftaran , seperti status nomor antrean , jadwal pemeriksaan atau informasi lainya seputr pendaftaran \n \nJika anda ingin mengakses menu lain silahkan ketik `start`');
                return NextResponse.json({
                    success: true,
                    reply: response
                });
            }

            // cek nik ke databse
            // RIWAYAT MEDIS
            console.log('Stored message:', storedMessage, storedMenu);
            if (storedMessage == 'nik_done' && (storedMenu == '2' || storedMenu == 'riwayatmedis')) {
                console.log('MENJALANKAN RIWAYAT MEDIS', message)
                // const systemMessagePrompt = 'Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. \n You can sort the results by relevant columns to return the most interesting examples in the database  \n if there is a question "sebutkan biodata dan riwayat penyakit dari nik 1001", then answer with an example "Berdasarkan NIK 1001, nama anda adalah John Doe, anda memiliki riwayat penyakit Flu, adakah yang ingin anda tanyakan dengan penyakit Flu" . If the question relates to information that is not in this database, answer with "No results found in the database."  \n  Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables. \n Please answer in Indonesian   Use the following format: \n Question: "Question here" \n SQLQuery: "SQL query to be executed" \n  SQLResult: "Result of SQLQuery" \n Answer: "Final answer here" \n Use only the tables listed below. {table_info} \n Question: {input}'
                const systemMessagePrompt = `
                Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                    The data given is patient data and their illnesses, if the user asks about the illnesses they suffer from, answer by referring to the medical history column


                    if there is a question "Diagnosa apa yang diberikan kepada saya{input}", then answer with an example "Berdasarkan NIK 330111, nama anda adalah Ali Nasgor, mempunyai penyakit flu" . If the question relates to information that is not in this database, answer with "No results found in the database."

                    Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.

                    Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                    Please answer in Indonesian

                    Use the following format:

                    Question: "Question here"
                    SQLQuery: "SQL query to be executed"
                    SQLResult: "Result of SQLQuery"
                    Answer: "Final answer here"

                    Use only the tables listed below.

                    {table_info}

                    Question: {input}`
                const response = await flowiseAI(`sebutkan biodata dan riwayat penyakit dari nik ${message}`, systemMessagePrompt, 'pengguna,riwayat_medis,poli,dokter');
                console.log('Response flow 1:', response);
                if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                    await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar atau belum melakukan registrasi rawat jalan 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                    return NextResponse.json({
                        success: true,
                        reply: response
                    });
                }
                await redisClient.set(sender + "_nik", message);
                await redisClient.set(sender, 'biodata_done');
                console.log('Set message to biodata_done for sender:', sender);
                await sendReply(sender, response.text);
                await flowiseAIGeneral(response.text, systemMessagePrompt2, sender);
                await sendReply(sender, 'Anda dapat menanyakan seputar riwayat medis anda , seperti  penyakit , penanganan pertama , dan informasi lainya seputr riwayat medis anda \n \nJika anda ingin mengakses menu lain silahkan ketik `start`');
                console.log('Response flow 2:', response);
                return NextResponse.json({
                    success: true,
                    reply: response
                });
            }

            // Penjadwalan Konsultasi
            if (storedMessage == 'nik_done' && (storedMenu == '3' || storedMenu == 'penjadwalankonsultasi')) {
                console.log('MENJALANKAN PENJADWALAN KONSULTASI', message)
                // const systemMessagePrompt = 'Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. \n You can sort the results by relevant columns to return the most interesting examples in the database. \n if there is a question "sebutkan nik , nama lengkap , tanggal konseling , jam konseling , nomor antrean , dan status  dengan nik 1001", then answer with an example "berdasarkan nik 1001 , Jhon doe memiliki jadwal konseling tanggal 2024-09-10 pada jam 09:00:00 dan sekarang sudah memiliki nomor antrean 1 dengan status selesai" . If the question relates to information that is not in this database, answer with "No results found in the database." \n  Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. \n Also pay attention to which columns are in which tables.Please answer in Indonesian   Use the following format: \n Question: "Question here" \n SQLQuery: "SQL query to be executed" \n  SQLResult: "Result of SQLQuery \n "Answer: "Final answer here" \n Use only the tables listed below. {table_info} \n Question: {input}'
                const systemMessagePrompt = `Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                        The data given is patient consultation schedule data, if the user asks for his consultation schedule, answer by referring to the consultation schedule column

                        if there is a question "Tanggal berapa saya konsultasi dengan dokter Dr. David Lee{input}", then answer with an example "Berdasarkan NIK 330111, anda terjadwal di tanggal 2024-09-10" . and if there is a question "Di jam berapa saya terdaftar konsultasi?", then answer with an example "Berdasarkan NIK 330111, anda terjadwal di jam 09:00:00" .If the question relates to information that is not in this database, answer with "No results found in the database."

                        Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.

                        Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                        Please answer in Indonesian

                        Use the following format:

                        Question: "Question here"
                        SQLQuery: "SQL query to be executed"
                        SQLResult: "Result of SQLQuery"
                        Answer: "Final answer here"

                        Use only the tables listed below.

                        {table_info}

                        Question: {input}`
                const response = await flowiseAI_1_3_5(message, systemMessagePrompt, 'pengguna,jadwal_konsultasi,antrean_medical_control', `sebutkan nik , nama lengkap , tanggal konseling , jam konseling , nomor antrean , dan status  dengan nik ${message}`, sender);
                console.log('Response flow 1:', response);
                if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                    await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar atau belum melakukan registrasi rawat jalan 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                    return NextResponse.json({
                        success: true,
                        reply: response
                    });
                }
                await redisClient.set(sender, 'biodata_done');
                await redisClient.set(sender + "_nik", message);
                console.log('Set message to biodata_done for sender:', sender);
                await sendReply(sender, response.text);
                return NextResponse.json({
                    success: true,
                    reply: response
                });
            }


            // BPJS DAN ASURANSI
            if (storedMessage == 'nik_done' && (storedMenu == '4' || storedMenu == 'bpjsdanasuransi')) {
                console.log('MENJALANKAN BPJS DAN ASURANSI', message)
                // const systemMessagePrompt = 'Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. \n You can sort the results by relevant columns to return the most interesting examples in the database \n if there is a question "sebutkan biodata dari {input}", then answer with an example "Berdasarkan NIK 1001, nama anda adalah Jhon doe , jenis asuransi Kartu Utama dengan nomor 1234567890 dan masa berlaku sampai 2026-12-31" , If the question relates to information that is not in this database, answer with "No results found in the database."  \n  Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. \n Also pay attention to which columns are in which tables.Please answer in Indonesian   Use the following format: \n Question: "Question here" \n SQLQuery: "SQL query to be executed" \n  SQLResult: "Result of SQLQuery \n "Answer: "Final answer here" \n Use only the tables listed below. {table_info} \n Question: {input}'
                const systemMessagePrompt = `
                                    Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                    The data provided is patient insurance and payment data. If the user asks about the payment received, answer by referring to the payment column and if the user asks about insurance, answer by referring to the insurance column.


                    if there is a question "berapa total pembayaran saya  {input}", then answer with an example "Berdasarkan NIK 1001, nama anda adalah Asep Knalpot, total pembayaran yang dilakukan sebesar 180000.00 pada tanggal 2024-09-03." . If the question relates to information that is not in this database, answer with "No results found in the database."

                    Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.

                    Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                    Please answer in Indonesian

                    Use the following format:

                    Question: "Question here"
                    SQLQuery: "SQL query to be executed"
                    SQLResult: "Result of SQLQuery"
                    Answer: "Final answer here"

                    Use only the tables listed below.

                    {table_info}

                    Question: {input}`
                const response = await flowiseAI(`sebutkan biodata dari nik ${message}`, systemMessagePrompt, 'pengguna,asuransi,penjamin');
                console.log('Response flow 1:', response);
                if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                    await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar atau belum melakukan registrasi rawat jalan 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                    return NextResponse.json({
                        success: true,
                        reply: response
                    });
                }
                await redisClient.set(sender, 'biodata_done');
                console.log('Set message to biodata_done for sender:', sender);
                await sendReply(sender, response.text);
                await flowiseAIGeneral(response.text, ststemMessagePrompt4, sender);
                console.log('Response flow 2:', response);
                return NextResponse.json({
                    success: true,
                    reply: response
                });
            }

            // PEMBAYARAN DAN PENAGIHAN
            if (storedMessage == 'nik_done' && (storedMenu == '5' || storedMenu == 'pembayarandanpenagihan')) {
                console.log("MENJALANKAN PEMBAYARAN DAN PENAGIHAN", message)
                // const systemMessagePrompt = 'Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. \n You can sort the results by relevant columns to return the most interesting examples in the database. \n if there is a question " sebutkan status  , nik , nama dan jumlah dengan nik 1001", then answer with condition in status column an example "berdasarkan nik 1001 , nama anda adalah jhon doe dengan status pembayaran lunas " but if in status column "Belum Bayar" ,then asnwering "berdasarkan nik 1001 , nama anda adalah jhon doe dengan status pembayaran Belum Lunas , Lakukan pembuayaran secepatnya dengan metode Tunai / non tunai"  . If the question relates to information that is not in this database, answer with "No results found in the database."\n   if there is a question "dengan dokter siapa yang harus saya temui jika nik saya 1002", then answer with an example "Anda harus bertemu dengan Dokter Jane Smith. di jam 08:00:00 sampai 12:00:00" . If the question relates to information that is not in this database, answer with "No results found in the database."  \n  Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. \n Also pay attention to which columns are in which tables.Please answer in Indonesian   Use the following format: \n Question: "Question here" \n SQLQuery: "SQL query to be executed" \n  SQLResult: "Result of SQLQuery \n "Answer: "Final answer here" \n Use only the tables listed below. {table_info} \n Question: {input}'
                const systemMessagePrompt = `
             Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                The data provided is patient insurance and payment data. If the user asks about the payment received, answer by referring to the payment column and if the user asks about insurance, answer by referring to the insurance column.


                if there is a question "berapa total pembayaran saya  {input}", then answer with an example "Berdasarkan NIK 1001, nama anda adalah Asep Knalpot, total pembayaran yang dilakukan sebesar 180000.00 pada tanggal 2024-09-03." . If the question relates to information that is not in this database, answer with "No results found in the database."

                Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.

                Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                Please answer in Indonesian

                Use the following format:

                Question: "Question here"
                SQLQuery: "SQL query to be executed"
                SQLResult: "Result of SQLQuery"
                Answer: "Final answer here"

                Use only the tables listed below.

                {table_info}

                Question: {input}`
                const response = await flowiseAI_1_3_5(message, systemMessagePrompt, 'pengguna,pembayaran', `sebutkan status pembayaran , nik , nama dan jumlah pembayaran dengan nik ${message}`, sender);
                console.log('Response flow 1:', response);
                if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                    await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar atau belum melakukan registrasi rawat jalan 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                    return NextResponse.json({
                        success: true,
                        reply: response
                    });
                }
                await redisClient.set(sender, 'biodata_done');
                await redisClient.set(sender + "_nik", message);
                console.log('Set message to biodata_done for sender:', sender);
                await sendReply(sender, response.text);
                return NextResponse.json({
                    success: true,
                    reply: response
                });
            }

            const nik = await redisClient.get(sender + "_nik");

            console.log("get information redis", storedMessage, storedMenu, nik)

            // khusus untuk menu 2 dan 4
            if (storedMessage == 'biodata_done' && (storedMenu == '2' || storedMenu == 'riwayatmedis' || storedMenu == '4' || storedMenu == 'bpjsdanasuransi')) {
                // dijawab oleh flowiseAI
                console.log("MENJALANKAN RIWAYAT MEDIS DAN BPJS DAN ASURANSI", message)
                let prompt: any = systemMessagePrompt2
                if (storedMenu == '2' || storedMenu == 'riwayatmedis') {
                    prompt = systemMessagePrompt2
                } else {
                    prompt = ststemMessagePrompt4
                }
                let response: any = await flowiseAIGeneral(message, prompt, sender);

                if (response.text.includes('Maaf untuk saat ini saya hanya ') || response.text.includes('Maaf, untuk saat ini saya hanya ')) {
                    const reply = response.text;
                    await sendReply(sender, reply);
                    await sendReply(sender, 'Jika anda ingin mengakses menu lain silahkan ketik `start`');
                    return NextResponse.json({
                        success: true,
                        reply: reply
                    });
                }

                const reply = response.text;
                await sendReply(sender, reply);
                return NextResponse.json({
                    success: true,
                    reply: reply
                });
            }

            if (storedMessage == 'biodata_done' && (storedMenu == '1' || storedMenu == 'registrasirawatjalan' || storedMenu == '3' || storedMenu == 'penjadwalankonsultasi' || storedMenu == '5' || storedMenu == 'pembayarandanpenagihan')) {
                console.log("MENJALANKAN REGISTRASI RAWAT JALAN , PENJADWALAN KONSULTASI , DAN PEMBAYARAN DAN PENAGIHAN", message)
                let systemMessagePrompt = 'Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. \n You can sort the results by relevant columns to return the most interesting examples in the database. \n  If the question relates to information that is not in this database, answer with "No results found in the database."  \n  Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. \n Also pay attention to which columns are in which tables.Please answer in Indonesian   Use the following format: \n Question: "Question here" \n SQLQuery: "SQL query to be executed" \n  SQLResult: "Result of SQLQuery \n "Answer: "Final answer here" \n Use only the tables listed below. {table_info} \n Question: {input}'
                let table: any = 'pengguna,janji_temu,poli,dokter,jadwal_dokter,antrean_pendaftaran'
                if (storedMenu == '1' || storedMenu == 'registrasirawatjalan') {
                    table = 'pengguna,janji_temu,poli,dokter,jadwal_dokter,antrean_pendaftaran,area_rs'
                    systemMessagePrompt = `
                    Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                        The data provided are user data, registration queue, polyclinic, doctor, and doctor's schedule. Each data is related to each other. if the user asks about a doctor, then answer with something related to what the user has given

                        If there is a question "mention the queue number, registration time, and status with NIK 1001", then answer with an example "based on NIK 1001 in the name of Jhon Doe, your queue number is 2 with a registration time of 2024-09-01 07:30 with a registered registration status. " If the question is related to information that is not in this database, answer with "No results found in the database."

                        please answer in detail and in detail according to the data provided, use another column to add your explanation, for example if there is a question "dengan deokter siapa saya harus bertemu jika nik saya 1002", then answer with an example "based on NIK 1002 in the name of Bagas Setiaji, you should meet Dr. Jane Smith at the Dental Clinic, you can come to Area B - Inpatient Building " If the question relates to information that is not in this database, answer with "No results found in the database."

                        Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                        Please answer in Indonesian

                        Use the following format:

                        Question: "Question here"

                        SQLQuery: "SQL query to be executed"

                        SQLResult: "Result of SQLQuery"

                        Answer: "Final answer here"

                        Use only the tables listed below.

                        {table_info}

                        Question: {input}
                `
                } else if (storedMenu == '3' || storedMenu == 'penjadwalankonsultasi') {
                    table = 'pengguna,jadwal_konsultasi,antrean_medical_control'
                    systemMessagePrompt = `Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                        The data given is patient consultation schedule data, if the user asks for his consultation schedule, answer by referring to the consultation schedule column

                        if there is a question "Tanggal berapa saya konsultasi dengan dokter Dr. David Lee{input}", then answer with an example "Berdasarkan NIK 330111, anda terjadwal di tanggal 2024-09-10" . and if there is a question "Di jam berapa saya terdaftar konsultasi?", then answer with an example "Berdasarkan NIK 330111, anda terjadwal di jam 09:00:00" .If the question relates to information that is not in this database, answer with "No results found in the database."

                        Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.

                        Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                        Please answer in Indonesian

                        Use the following format:

                        Question: "Question here"
                        SQLQuery: "SQL query to be executed"
                        SQLResult: "Result of SQLQuery"
                        Answer: "Final answer here"

                        Use only the tables listed below.

                        {table_info}

                        Question: {input}`
                } else {
                    systemMessagePrompt = `
                Given an input question, first construct a syntactically correct {dialect} query to run, then look at the query results and return the answer. Unless the user specifies in their question a specific number of examples they want to get, always limit your query to a maximum of {top_k} results. You can sort the results by relevant columns to return the most interesting examples in the database.

                The data provided is patient insurance and payment data. If the user asks about the payment received, answer by referring to the payment column and if the user asks about insurance, answer by referring to the insurance column.


                if there is a question "berapa total pembayaran saya  {input}", then answer with an example "Berdasarkan NIK 1001, nama anda adalah Asep Knalpot, total pembayaran yang dilakukan sebesar 180000.00 pada tanggal 2024-09-03." . If the question relates to information that is not in this database, answer with "No results found in the database."

                Never ask for all columns from a given table, ask for only a few columns that are relevant to the question.

                Be careful to only use column names that you can see in the schema description. Be careful not to ask for columns that do not exist. Also pay attention to which columns are in which tables.

                Please answer in Indonesian

                Use the following format:

                Question: "Question here"
                SQLQuery: "SQL query to be executed"
                SQLResult: "Result of SQLQuery"
                Answer: "Final answer here"

                Use only the tables listed below.

                {table_info}

                Question: {input}`
                    table = 'pengguna,pembayaran'
                }
                console.log("parameter", message + `jika nik saya adalah ${nik}`, systemMessagePrompt, table, message)
                const response = storedMenu == '1' || storedMenu == 'registrasirawatjalan' ? await flowiseAI_1(message + `jika nik saya adalah ${nik}`, systemMessagePrompt, table, message, sender) : await flowiseAI_1_3_5(message + `jika nik saya adalah ${nik}`, systemMessagePrompt, table, message, sender);
                console.log("RESPONSE FLOW 1", response)
                const reply = response.text;
                await sendReply(sender, reply);
                return NextResponse.json({
                    success: true,
                    reply: reply
                });
            }

        }




        const sendReplyResponse = await sendReply(sender, 'maaf , mungkin anda salah pilih menu , silahkan ketik `start` untuk memulai ulang');

        return NextResponse.json({ success: true, sendReplyResponse });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
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



async function flowiseAIGeneral(input: string, systemMessagePrompt: string, sessionid: any) {
    console.log("FLOWISEAIGENERAL", input, systemMessagePrompt, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/c6ff5c51-b0d5-4875-a994-463ed49f0b25';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            chatId: `0a9d3dff-265b-49a3-a41c-${sessionid}`,
            overrideConfig: {
                systemMessagePrompt: systemMessagePrompt,
            }
        }),
    });

    return responses.json();
}

async function flowiseAI_1(input: string, systemMessagePrompt: string, tablle: string, question: string, sessionid: any) {
    console.log("FLOWISEAI1 aja", input, systemMessagePrompt, tablle)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/d9f1c9f9-40af-4797-8428-a8e30dc4d504';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: question,
            chatId: `df0ae3a4-ec62-4d5d-b758-dc2ecb3e9cff`,

        }),
    });

    return responses.json();
}

async function flowiseAI_1_3_5(input: string, systemMessagePrompt: string, tablle: string, question: string, sessionid: any) {
    console.log("FLOWISEAI123", input, systemMessagePrompt, tablle)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/8c1c3efc-a126-46dd-8f44-63b233494d46';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: question,
            chatId: `0a9d3dff-265b-49a3-a41c-${sessionid}`,
            overrideConfig: {
                includesTables: tablle,
                customPrompt: systemMessagePrompt
            }

        }),
    });

    return responses.json();
}


async function flowiseAI(input: string, systemMessagePrompt: string, tablle: string) {
    console.log("FLOWISEAISQL", input, systemMessagePrompt, tablle)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/8c1c3efc-a126-46dd-8f44-63b233494d46';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            overrideConfig: {
                includesTables: tablle,
                customPrompt: systemMessagePrompt
            }

        }),
    });

    return responses.json();
}

// csv file flowiseAI
async function flowiseAIFromCSV(input: string) {
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/598d0480-372a-4a3f-a376-fc832fa1ef26';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "question": input,
        }),
    });

    return responses.json();
}