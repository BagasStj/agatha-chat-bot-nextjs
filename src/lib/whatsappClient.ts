import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

class WhatsAppClient {
    private client: Client;

    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth()
        });

        this.client.on('qr', (qr) => {
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('Client is ready!');
        });

        this.client.initialize();
    }

    async sendMessage(to: string, message: string) {
        try {
            const formattedNumber = to.includes('@c.us') ? to : `${to}@c.us`;
            await this.client.sendMessage(formattedNumber, message);
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }
}

const whatsappClient = new WhatsAppClient();
export default whatsappClient;