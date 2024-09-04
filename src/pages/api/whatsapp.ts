// import { NextApiRequest, NextApiResponse } from 'next'
// import { sendWhatsAppMessage } from '@/lib/whatsapp'

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method === 'POST') {
//       const { phoneNumber, message } = req.body
//       try {
//         const result = await sendWhatsAppMessage(phoneNumber, message)
//         if (result.success) {
//           res.status(200).json({ message: 'Message sent successfully' })
//         } else {
//           console.error('Failed to send message:', result.message)
//           res.status(500).json({ error: result.message })
//         }
//       } catch (error) {
//         console.error('Error in sendWhatsAppMessage API:', error)
//         res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' })
//       }
//     } else {
//       res.setHeader('Allow', ['POST'])
//       res.status(405).end(`Method ${req.method} Not Allowed`)
//     }
//   }