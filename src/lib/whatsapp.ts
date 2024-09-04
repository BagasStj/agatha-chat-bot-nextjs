// import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
// import { Boom } from '@hapi/boom'

// let sock: ReturnType<typeof makeWASocket> | null = null;

// async function connectToWhatsApp() {
//   if (sock) return sock;

//   const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  
//   sock = makeWASocket({
//     auth: state,
//     printQRInTerminal: true,
//   })

//   sock.ev.on('connection.update', (update) => {
//     const { connection, lastDisconnect } = update
//     if(connection === 'close') {
//       const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
//       console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
//       if(shouldReconnect) {
//         connectToWhatsApp()
//       }
//     } else if(connection === 'open') {
//       console.log('opened connection')
//     }
//   })

//   sock.ev.on('creds.update', saveCreds)

//   return sock
// }

// export async function sendWhatsAppMessage(phoneNumber: string, message: string) {
//     try {
//       const socket = await connectToWhatsApp()
//       const formattedNumber = phoneNumber.startsWith('0') ? '62' + phoneNumber.slice(1) : phoneNumber
//       const jid = formattedNumber.includes('@s.whatsapp.net') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`
      
//       await socket.sendMessage(jid, { text: message })
//       return { success: true, message: 'Message sent successfully' }
//     } catch (error) {
//       console.error('Error sending WhatsApp message:', error)
//       return { success: false, message: error instanceof Error ? error.message : 'Failed to send message' }
//     }
//   }

// export default connectToWhatsApp