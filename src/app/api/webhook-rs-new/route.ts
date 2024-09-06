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
        console.log('Testing DISINI :', req);
        let sender, message: any;

        if (req.method === 'POST') {
            const body = await req.json();
            ({ sender, message } = body);
        } else if (req.method === 'GET') {
            const params = new URL(req.url).searchParams;
            sender = params.get('sender');
            message = params.get('message');
        }

        // Proses pesan yang diterima
        console.log('Pesan diterima:', { sender, message });
        const greetings = ['hi', 'hello', 'hai', 'hallo', 'halo', 'selamatpagi', 'selamatsiang', 'selamatsore', 'selamatmalam', 'start'];
        const menuText = ['registrasirawatjalan', 'riwayatmedis', 'penjadwalankonsultasi', 'bpjsdanasuransi', 'pembayarandanpenagihan'];
        const promptGeneral_2 = 'You are an AI assistant who is highly skilled in providing medical information and knowledge about various disease conditions. You can only answer questions related to disease conditions, treatments, symptoms, causes, and relevant care. You cannot answer questions that are outside the scope of medical and health. Every question asked by a user about a disease condition will be recorded and stored in your memory, allowing you to refer to previous questions to provide more accurate and contextual answers to new related questions. \n Example of use: \n • Users can ask about symptoms, causes, or treatments of a disease. \n• You can provide information about preventive measures, self-care, or when to seek professional medical help. \n• You can explain the differences between commonly misunderstood conditions or provide general advice based on reliable medical knowledge. if there is a question that is not relevant, please provide the answer "sorry for now I can only answer about health or medical conditions. If you want to change the menu, please type `start`. Thank you" \n please answer in Indonesian';
        const promptGeneral_4 = `You are an AI assistant who is very knowledgeable in health insurance, including BPJS and various other types of health insurance. You can only answer questions related to information about BPJS, health insurance, service coverage, claim procedures, and available benefits. You cannot answer questions outside the scope of health insurance. Every question asked by a user regarding BPJS or health insurance will be recorded and stored in your memory, allowing you to refer to previous questions to provide more accurate and contextual answers to new related questions.\n\nExample of use:\n• Users can ask about the types of services covered by BPJS or certain health insurance.\n• You can provide information about the registration procedure for BPJS or other health insurance, including the terms and conditions.\n• You can explain the differences between BPJS and private health insurance, as well as the advantages and disadvantages of each.\n• You can provide guidance on how to file a claim, the required documents, and the insurance claim process.\n• You can answer questions about premium costs, coverage coverage, and how to choose health insurance that suits your needs.\nplease answer in Indonesian`

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

            // Proses tanya  NIK
            if (message == '1' || message == '2' || message == '3' || message == '4' || message == '5' || menuText.some(menu => message.toLowerCase().replace(/\s+/g, '').includes(menu))) {
                let reply = "Anda telah memilih menu " + message + " \nTolong Inputkan NIK anda untuk mengakses fitur tersebut";
                await redisClient.set(sender, 'ask_nik');
                await redisClient.set(sender + "_menu", message);
                console.log('Set message to ask_nik for sender:', sender);
                await sendReply(sender, reply);
                return NextResponse.json({
                    success: true,
                    reply: reply
                });
            }


            // proses nik dan diolah berdasarkan menu yang di pilih
            const storedMessage = await redisClient.get(sender);
            const storedMenu = await redisClient.get(sender + "_menu");
            if (storedMessage == 'ask_nik') {
                // Registrasi rawat jalan
                if (storedMenu == '1' || storedMenu == 'registrasirawatjalan') {

                    const response = await flowiseAIMenu_1(`sebutkan nomor antrian, waktu registrasi, dan status dengan NIK ${message}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar atau belum melakukan registrasi rawat jalan 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // Riwayat medis
                if (storedMenu == '2' || storedMenu == 'riwayatmedis') {
                    const response = await flowiseAIMenu_2(`sebutkan biodata dan riwayat dari nik ${message}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // Penjadwalan konsultasi
                if (storedMenu == '3' || storedMenu == 'penjadwalankonsultasi') {
                    const response = await flowiseAIMenu_3(`dengan dokter siapa saya berkonsultasi jika nik saya ${message}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // BPJS dan Asuransi
                if (storedMenu == '4' || storedMenu == 'bpjsdanasuransi') {
                    const response = await flowiseAIMenu_4(`sebutkan biodata dan asuransi dari nik ${message}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // Pembayaran dan Penagihan
                if (storedMenu == '5' || storedMenu == 'pembayarandanpenagihan') {
                    const response = await flowiseAIMenu_5(`berapa total pembayaran saya jika nik saya ${message}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }
            }

            const storedNIK = await redisClient.get(sender + "_nik");
            // proses menanyakan berkelanjutan 
            if (storedMessage == 'nik_done') {

                // Registrasi rawat jalan
                if (storedMenu == '1' || storedMenu == 'registrasirawatjalan') {

                    const response = await flowiseAIMenu_1(`${message} jika nik saya ${storedNIK}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // Riwayat medis
                if (storedMenu == '2' || storedMenu == 'riwayatmedis') {
                    // const response = await flowiseAIMenu_2(`${message} jika nik saya ${storedNIK}`, sender);
                    const response = await flowiseAIGeneral(message, promptGeneral_2, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        const response_general = await flowiseAIGeneral(message, promptGeneral_2, sender);
                        await sendReply(sender, response_general.text);
                        return NextResponse.json({
                            success: true,
                            reply: response_general.text
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    // await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // Penjadwalan konsultasi
                if (storedMenu == '3' || storedMenu == 'penjadwalankonsultasi') {
                    const response = await flowiseAIMenu_3(`${message} jika nik saya ${storedNIK}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // BPJS dan Asuransi
                if (storedMenu == '4' || storedMenu == 'bpjsdanasuransi') {
                    // const response = await flowiseAIMenu_4(`${message} jika nik saya ${storedNIK}`, sender);
                    const response = await flowiseAIGeneral(message, promptGeneral_4, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        const response_general = await flowiseAIGeneral(message, promptGeneral_4, sender);  
                        await sendReply(sender, response_general.text);
                        return NextResponse.json({
                            success: true,
                            reply: response_general.text
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    // await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }

                // Pembayaran dan Penagihan
                if (storedMenu == '5' || storedMenu == 'pembayarandanpenagihan') {
                    const response = await flowiseAIMenu_5(`${message} jika nik saya ${storedNIK}`, sender);
                    console.log('FlowiseAI response:', response);
                    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'No results found in the database.') {
                        await sendReply(sender, ' Maaf , Untuk saat ini data yang anda masukan belum terdaftar 😔 ,\n mungkin anda salah pilih menu atau salah input nik anda ,\n untuk milih menu kembali silahkan ketik `start`');
                        return NextResponse.json({
                            success: true,
                            reply: response
                        });
                    }
                    await sendReply(sender, response.text);
                    await redisClient.set(sender, 'nik_done');
                    // await redisClient.set(sender + "_nik", message)
                    return NextResponse.json({
                        success: true,
                        reply: response.text
                    });
                }
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

// flowiseAI untuk general bpjs asuransi dan riwayat penyakit
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

// flowiseAI untuk menu 1
async function flowiseAIMenu_1(input: string, sessionid: any) {
    console.log("FLOWISEAIGENERAL", input, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/d9f1c9f9-40af-4797-8428-a8e30dc4d504';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            chatId: `0a9d3dff-265b-45a3-a32c-${sessionid}`,
        }),
    });

    return responses.json();
}

// flowiseAI untuk menu 2
async function flowiseAIMenu_2(input: string, sessionid: any) {
    console.log("FLOWISEAIGENERAL", input, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/aa47ddaa-f368-499d-862e-fcab5ae194d4';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            chatId: `0a3d2dff-321b-49a3-a43d-${sessionid}`,
        }),
    });

    return responses.json();
}

// flowiseAI untuk menu 3
async function flowiseAIMenu_3(input: string, sessionid: any) {
    console.log("FLOWISEAIGENERAL", input, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/f79aece0-4b19-4b3f-b18e-ab027b0565ff';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            chatId: `423ds12a-a561-4b1-32bb-${sessionid}`,
        }),
    });

    return responses.json();
}

// flowiseAI untuk menu 4
async function flowiseAIMenu_4(input: string, sessionid: any) {
    console.log("FLOWISEAIGENERAL", input, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/0d70067c-82ba-4dcb-ac87-7130306c1576';
    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            chatId: `4543d74a-a561-4b53-32bb-${sessionid}`,
        }),
    });

    return responses.json();
}

// flowiseAI untuk menu 5
async function flowiseAIMenu_5(input: string, sessionid: any) {
    console.log("FLOWISEAIGENERAL", input, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/b28deb38-fd23-42bc-be1d-f9a8e033a305';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            chatId: `3123d74a-a561-4b73-98bb-${sessionid}`,
        }),
    });

    return responses.json();
}



