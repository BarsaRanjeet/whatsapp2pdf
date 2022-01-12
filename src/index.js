import { WAConnection } from '@adiwajshing/baileys'
import * as fs from 'fs'
import prompt from 'prompt';

const data = {
    FromDate: new Date("2021-12-01"),
    ToDate: new Date("2021-12-05"),
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
//         data.FromDate = result.FromDate;
//         data.ToDate = result.ToDate;
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


const findDate = () => {
    loadMessages(data.cursor).then((val) => {
        const messages = val.messages;
        const past_day = messages[0].messageTimestamp.low * 1000 + (5.5 * 60 * 60 * 1000);
        const last_day = messages[messages.length - 1].messageTimestamp.low * 1000 + (5.5 * 60 * 60 * 1000);

        console.log(new Date(messages[0].messageTimestamp.low * 1000 + (5.5 * 60 * 60 * 1000)));

        // if both FromDate and ToDate are not worthy
        if (past_day >= data.FromDate.getTime() && past_day >= data.ToDate.getTime()) {
            data.cursor = val.cursor;
            findDate(); // recurson
            return
        }

        // if from date is worthy
        if (past_day <= data.FromDate.getTime()) {
            data.start_id = val.cursor;
            data.end_id = data.cursor;
            if (data.end_id != null) data.count += 10;
        }

        // if To Date is worthy
        if (past_day <= data.ToDate.getTime() && data.end_id == null) {
            data.end_id = val.cursor;
        }

        // If both not satisfied then will be trying finding correct date
        if (data.start_id == null || data.end_id == null) {
            data.cursor = val.cursor;
            if (data.end_id != null) data.count += 10;
            findDate();
            return
        }
        console.log(data);
    });
};

findDate();
// });