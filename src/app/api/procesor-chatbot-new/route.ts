import { saveMessage } from '@/db/messages';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';


export async function POST(req: NextRequest) {
    return handleWebhook(req);
}


async function handleWebhook(req: NextRequest) {
    try {
        let sender, message: any;
        const body = await req.json();
        ({ sender, message } = body);
        const logId = uuidv4();
        const method = req.method;

        // await logApiCall(logId, method, sender, message);


        if (sender && message) {
            try {
                await saveMessage(sender, message);
            } catch (dbError) {
                console.error('Error saving to database:', dbError);
            }
        }
        const coso = await flowiseAIDOC(message, sender);
        if (coso.text.includes("Hmm, I'm not sure.")) {
            const coso2 = await flowiseAIGeneral(message, sender);
            return NextResponse.json({ success: true, reply: coso2.text });
        }
        return NextResponse.json({ success: true, reply: coso.text });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}


async function flowiseAIDOC(input: string, sessionid: any) {
    console.log("FLOWISEAIDOC", input, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/891f53aa-b953-465d-b1e0-54423a4477ce';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            "chatId": "a12b90a7-552d-4535-9998-a2d524c114d9"
        }),
    });

    return responses.json();
}


async function flowiseAIGeneral(input: string, sessionid: any) {
    console.log("FLOWISEAIGeneral", input, sessionid)
    const url = 'https://flowiseai-railway-production-9629.up.railway.app/api/v1/prediction/9bfbf6e6-1419-4abf-83df-6c18327dfed3';

    const responses = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: input,
            chatId: "b3ab0079-9b53-48d7-9f55-21f7f88298d9",
        }),
    });

    return responses.json();
}

