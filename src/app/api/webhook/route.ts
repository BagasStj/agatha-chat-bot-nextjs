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

    // Proses pesan yang diterima
    console.log('Pesan diterima:', { sender, message });
    const greetings = ['hi', 'hello', 'hai', 'hallo', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam'];
    if(message != null){
      if (greetings.some(greeting => message.toLowerCase().includes(greeting))) {
        let reply = 'Hai!👋 Saya adalah bot interaktif yang siap membantu Anda 🥰. Saya bisa menjawab pertanyaan Anda tentang pasal undang undang  perlindungan data pribadidengan menggunakan bahasa sehari-hari yang Anda gunakan, yuk tanyakan saja! 🚀';
        await sendReply(sender, reply);
        return NextResponse.json({
          success: true,
          reply: reply
        });
      }
    }


    // dijawab oleh flowiseAI
    const response = await flowiseAI(message);

    if (response.text == 'Tidak ada hasil yang ditemukan dalam database.' || response.text == 'Jawaban: Tidak ada data yang ditemukan untuk isi dari data pribadi.') {
      const response = await flowiseAIFromCSV(message);
      const reply = response.text;
      if (reply == 'hemm , iam not sure') {
        const answer = 'Maaf, saya tidak mengerti pertanyaan Anda. Silakan coba lagi. 🤔';
        await sendReply(sender, answer);
        return NextResponse.json({
          success: true,
          reply: reply
        });
      }

      await sendReply(sender, reply);
      return NextResponse.json({
        success: true,
        reply: reply
      });
    }

    const reply = response.text;

    const sendReplyResponse = await sendReply(sender, reply);


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

async function flowiseAI(input: string) {
  const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/b28deb38-fd23-42bc-be1d-f9a8e033a305';

  const responses = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: input,
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
      "chatId": "ca834cec-9f97-4ea8-a929-3a656228aca3",
      "socketIOClientId": "vezTJdZz_H9JRb5QAAHt"
    }),
  });

  return responses.json();
}