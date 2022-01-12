import { WAConnection } from '@adiwajshing/baileys'
import * as fs from 'fs'
import prompt from 'prompt';
import moment from 'moment';
import { GeneratePDF } from './pdf.mjs'
import { mapAsync } from 'lodasync'

const data = {
    FromDate: new Date("2022-01-08"),
    ToDate: new Date("2022-01-10T23:59:59.999Z"),
    start_id: null,
    end_id: null,
    cursor: null,
    count: 0
}

const office_order = "919909955422-1465194455@g.us";

/***
 * Getting inputs from user such as from date and todate
 */

// const getUserInputs = new Promise((gotInputs) => {
//     const properties = [
//         {
//             name: 'FromDate',
//             validator: /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/,
//             warning: 'Date format: yyyy-mm-dd -> for example: 2022-08-25'
//         },
//         {
//             name: 'ToDate',
//             validator: /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/,
//             warning: 'Date format: yyyy-mm-dd -> for example: 2022-08-25'
//         }
//     ];

//     prompt.start();

//     prompt.get(properties, function (err, result) {
//         if (err) {
//             return onErr(err);
//         }
//         console.log("************* Program started *************");
//         data.FromDate = new Date(result.FromDate);
//         data.ToDate = new Date(`${result.ToDate}T23:59:59.999Z`);
//         gotInputs();
//     });

//     function onErr(err) {
//         console.log(err);
//         return 1;
//     }
// });


// getUserInputs.then(async () => {

const conn = new WAConnection();
// conn.logger.level = 'debug'; // when you develop and need to debug

/**
 * Storing or generating session!!
 */
try {
    conn.loadAuthInfo('./auth_info.json');
    await conn.connect();
} catch (_e) {
    await conn.connect();
}

if (conn.state) { storeSession(conn); }
conn.on('open', () => {
    storeSession(conn);
})

conn.on('chat-update', chatUpdate => {
    if (chatUpdate.messages && chatUpdate.count) {
        const message = chatUpdate.messages.all()[0]
        console.log(message.key.remoteJid, chatUpdate.jid)
        // console.log(message.key.id)
        // const contact = conn.chats.get(chatUpdate.jid);
        // console.log(contact);
        // console.log(message);
    }
    else console.log(chatUpdate);
})

function storeSession(conn) {
    console.log("saving session");
    const authInfo = conn.base64EncodedAuthInfo();
    fs.writeFileSync('./auth_info.json', JSON.stringify(authInfo, null, '\t'));
}

const loadMessages = (cursor) => {
    return new Promise(async (resolutionFunc) => {
        // const chats = await conn.loadMessages("918866464813-1602851606@g.us", 10, cursor); // Note
        const chats = await conn.loadMessages(office_order, 10, cursor); // Note
        resolutionFunc(chats);
    });
}

// after getting From and To date messages will get final messages
const loadFinalMessages = (cursor, count) => {
    return new Promise(async (resolutionFunc) => {
        const chats = await conn.loadMessages(office_order, count, cursor); // Note
        resolutionFunc(chats);
    });
}


const findDate = () => {
    loadMessages(data.cursor).then((val) => {
        const messages = val.messages;
        const past_day = messages[0].messageTimestamp.low * 1000 + (5.5 * 60 * 60 * 1000);
        // const last_day = messages[messages.length - 1].messageTimestamp.low * 1000 + (5.5 * 60 * 60 * 1000); // incase if required this variable

        // console.log(new Date(messages[0].messageTimestamp.low * 1000 + (5.5 * 60 * 60 * 1000)));

        // if both FromDate and ToDate are not worthy
        if (past_day >= data.FromDate.getTime() && past_day >= data.ToDate.getTime()) {
            data.cursor = val.cursor;
            findDate(); // recurson
            return
        }

        // if from date is worthy
        if (past_day <= data.FromDate.getTime()) {
            data.start_id = val.cursor;
            if (data.end_id != null) data.count += 10;
        }

        // if To Date is worthy
        if (past_day <= data.ToDate.getTime() && data.end_id == null) {
            data.end_id = data.cursor;
        }

        // If both not satisfied then will be trying finding correct date
        if (data.start_id == null || data.end_id == null) {
            data.cursor = val.cursor;
            if (data.end_id != null) data.count += 10;
            findDate();
            return
        }

        // load all messages between from date to To date
        loadFinalMessages(data.end_id, data.count).then(async (val) => {
            const finalMessages = val.messages;
            const results = [];
            // const result = finalMessages.map(async (msg) => {
            //     const msg_timestamp = msg.messageTimestamp.low * 1000; // for local + (5.5 * 60 * 60 * 1000)
            //     if (data.ToDate >= msg_timestamp && data.FromDate <= msg_timestamp) {
            //         const message_data = msg.message;
            //         const key = msg.key;
            //         const from = conn.contacts[msg.participant].notify;
            //         const date = moment(new Date(msg_timestamp)).format('MMM Do YYYY, h:mm a');
            //         const image = (message_data.imageMessage) ? await conn.downloadAndSaveMediaMessage(msg, `./src/images/${key.id}`) : "";
            //         const message = (message_data.conversation) ? message_data.conversation : "";
            //         const type = "";
            //         return { date, type, from, message, image };
            //     }
            // })
                const result = await mapAsync(async (msg) => {
                    const msg_timestamp = msg.messageTimestamp.low * 1000; // for local + (5.5 * 60 * 60 * 1000)
                    if (data.ToDate >= msg_timestamp && data.FromDate <= msg_timestamp) {
                        const message_data = msg.message;
                        const key = msg.key;
                        const from = conn.contacts[msg.participant].notify;
                        const date = moment(new Date(msg_timestamp)).format('MMM Do YYYY, h:mm a');
                        const image = (message_data.imageMessage) ? await conn.downloadAndSaveMediaMessage(msg, `./src/images/${key.id}`) : "";
                        const message = (message_data.conversation) ? message_data.conversation : "";
                        const type = "";
                        return { date, type, from, message, image };
                    }
                }, finalMessages)

                Promise.all(result).then(() => {
                    const genPDF = new GeneratePDF(results);
                    genPDF.generate();
                    console.log("Done!!");
                })

        });
    });
};

findDate();
// });