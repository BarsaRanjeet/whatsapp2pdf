import { WAConnection } from '@adiwajshing/baileys'
import * as fs from 'fs'
import prompt from 'prompt';
import moment from 'moment';
import { GeneratePDF } from './pdf.mjs'

const data = {
    FromDate: new Date("2022-01-11"),
    ToDate: new Date("2022-01-13T23:59:59.999Z"),
    start_id: null,
    end_id: null,
    cursor: null,
    count: 0
}

const test = "918866464813-1602851606@g.us";
let office_order = "919909955422-1465194455@g.us";

// replacing for development
// office_order = test

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

// conn.on('chat-update', chatUpdate => {
//     if (chatUpdate.messages && chatUpdate.count) {
//         const message = chatUpdate.messages.all()[0]
//         console.log(message.key.remoteJid, chatUpdate.jid)
//         // console.log(message.key.id)
//         // const contact = conn.chats.get(chatUpdate.jid);
//         // console.log(contact);
//         console.log(message);
//     }
//     else console.log(chatUpdate);
// })

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
            data.count = (data.end_id != null) ? data.count + 10 : data.count;
        }

        // if To Date is worthy
        if (past_day <= data.ToDate.getTime() && data.end_id == null) {
            data.end_id = data.cursor;
        }

        // If both not satisfied then will be trying finding correct date
        if (data.start_id == null || data.end_id == null) {
            data.cursor = val.cursor;
            data.count = (data.end_id != null) ? data.count + 10 : data.count;
            findDate();
            return
        }

        const messageTyeps = {
            imageMessage: "Image",

        }

        // load all messages between from date to To date
        loadFinalMessages(data.end_id, data.count).then(async (val) => {
            const finalMessages = val.messages;
            const results = {};
            for (let msg of finalMessages) {
                console.clear();
                const msg_timestamp = msg.messageTimestamp.low * 1000; // for local + (5.5 * 60 * 60 * 1000)
                if (data.ToDate >= msg_timestamp && data.FromDate <= msg_timestamp && msg.message != null) {
                    const message_data = msg.message;
                    const key = msg.key;
                    const id = key.id;
                    const from = (msg.key.fromMe) ? 'From Me' : (conn.contacts[msg.participant].name) ? conn.contacts[msg.participant].name : conn.contacts[msg.participant].notify;
                    const date = moment(new Date(msg_timestamp)).format('MMM Do YYYY, h:mm a');
                    console.log("Reading messages of ", date);
                    const image = "";
                    const path = `./src/images/${key.id}.jpeg`;
                    if (message_data.imageMessage && !fs.existsSync(path)) {
                        // const img = await conn.loadMessage(office_order, key.id); // for troubleshooting a problem
                        image = (message_data.imageMessage) ? await conn.downloadAndSaveMediaMessage(msg, `./src/images/${key.id}`) : "";
                    }
                    let message = "";
                    if (message_data.conversation)
                        message = message_data.conversation;
                    else if (message_data.imageMessage)
                        message = message_data.imageMessage.caption;
                    else if (message_data.extendedTextMessage)
                        message = message_data.extendedTextMessage.text;
                    let type = "";
                    if (message_data.conversation)
                        type = "New MSG";
                    else if (message_data.imageMessage)
                        type = "IMG MSG";

                    if (message_data.extendedTextMessage) {
                        if (!message_data.extendedTextMessage.contextInfo.quotedMessage) {
                            type = "Mentioned MSG";
                            results[id] = { date, type, from, message, image };
                        }
                        else {
                            type = "Reply MSG";

                            let reply_messages = [];
                            let latest_old_id = id;
                            while (true) {
                                const oldChat = await conn.loadMessage(office_order, latest_old_id);
                                let oldChatMessageData = null;
                                oldChatMessageData = await oldChat.message;
                                if (!!oldChatMessageData.extendedTextMessage) {
                                    if (oldChatMessageData.extendedTextMessage.contextInfo.quotedMessage) {
                                        const oldmsg_timestamp = oldChat.messageTimestamp.low * 1000; // for local + (5.5 * 60 * 60 * 1000)

                                        const oldfrom = (oldChat.key.fromMe) ? 'From Me' : (conn.contacts[oldChat.participant].name) ? conn.contacts[oldChat.participant].name : conn.contacts[oldChat.participant].notify;
                                        const olddate = moment(new Date(oldmsg_timestamp)).format('MMM Do YYYY, h:mm a');
                                        const oldimage = "";
                                        const path = `./src/images/${oldChat.key.id}.jpeg`;
                                        if (oldChatMessageData.imageMessage && !fs.existsSync(path))
                                            oldimage = (oldChatMessageData.imageMessage) ? await conn.downloadAndSaveMediaMessage(oldChat, `./src/images/${oldChat.key.id}`) : "";
                                        let oldmessage = "";
                                        if (oldChatMessageData.conversation)
                                            oldmessage = oldChatMessageData.conversation;
                                        else if (oldChatMessageData.imageMessage)
                                            oldmessage = oldChatMessageData.imageMessage.caption;
                                        else if (oldChatMessageData.extendedTextMessage)
                                            oldmessage = oldChatMessageData.extendedTextMessage.text;
                                        let oldtype = "";
                                        if (oldChatMessageData.conversation)
                                            oldtype = "New MSG";
                                        else if (oldChatMessageData.imageMessage)
                                            oldtype = "IMG MSG";
                                        else if (oldChatMessageData.extendedTextMessage) {
                                            if (!oldChatMessageData.extendedTextMessage.contextInfo.quotedMessage)
                                                oldtype = "Mentioned MSG";
                                            else if (oldChatMessageData.extendedTextMessage.contextInfo.quotedMessage) {
                                                oldtype = "Reply MSG";
                                            }
                                        }
                                        latest_old_id = oldChatMessageData.extendedTextMessage.contextInfo.stanzaId;
                                        reply_messages.push({ date: olddate, type: oldtype, from: oldfrom, message: oldmessage, image: oldimage })
                                    }
                                    else {
                                        if (results[oldChat.key.id]) {
                                            const messageData = results[oldChat.key.id];
                                            results[oldChat.key.id] = { ...messageData, reply: reply_messages }
                                        } else {
                                            const oldmsg_timestamp = oldChat.messageTimestamp.low * 1000; // for local + (5.5 * 60 * 60 * 1000)

                                            const oldfrom = (oldChat.key.fromMe) ? 'From Me' : (conn.contacts[oldChat.participant].name) ? conn.contacts[oldChat.participant].name : conn.contacts[oldChat.participant].notify;
                                            const olddate = moment(new Date(oldmsg_timestamp)).format('MMM Do YYYY, h:mm a');
                                            const oldimage = "";
                                            const path = `./src/images/${oldChat.key.id}.jpeg`;
                                            if (oldChatMessageData.imageMessage && !fs.existsSync(path))
                                                oldimage = (oldChatMessageData.imageMessage) ? await conn.downloadAndSaveMediaMessage(oldChat, `./src/images/${oldChat.key.id}`) : "";
                                            let oldmessage = "";
                                            if (oldChatMessageData.conversation)
                                                oldmessage = oldChatMessageData.conversation;
                                            else if (oldChatMessageData.imageMessage)
                                                oldmessage = oldChatMessageData.imageMessage.caption;
                                            else if (oldChatMessageData.extendedTextMessage)
                                                oldmessage = oldChatMessageData.extendedTextMessage.text;
                                            let oldtype = "";
                                            if (oldChatMessageData.conversation)
                                                oldtype = "New MSG";
                                            else if (oldChatMessageData.imageMessage)
                                                oldtype = "IMG MSG";
                                            else if (oldChatMessageData.extendedTextMessage) {
                                                if (!oldChatMessageData.extendedTextMessage.contextInfo.quotedMessage)
                                                    oldtype = "Mentioned MSG";
                                                else if (oldChatMessageData.extendedTextMessage.contextInfo.quotedMessage) {
                                                    oldtype = "Reply MSG";
                                                }
                                            }
                                            results[oldChat.key.id] = { date: olddate, type: oldtype, from: oldfrom, message: oldmessage, image: oldimage, reply: reply_messages };
                                        }
                                        break;
                                    }
                                }
                                else {
                                    if (results[oldChat.key.id]) {
                                        const messageData = results[oldChat.key.id];
                                        results[oldChat.key.id] = { ...messageData, reply: reply_messages }
                                    } else {
                                        const oldmsg_timestamp = oldChat.messageTimestamp.low * 1000; // for local + (5.5 * 60 * 60 * 1000)

                                        const oldfrom = (oldChat.key.fromMe) ? 'From Me' : (conn.contacts[oldChat.participant].name) ? conn.contacts[oldChat.participant].name : conn.contacts[oldChat.participant].notify;
                                        const olddate = moment(new Date(oldmsg_timestamp)).format('MMM Do YYYY, h:mm a');

                                        const oldimage = "";
                                        const path = `./src/images/${oldChat.key.id}.jpeg`;
                                        if (oldChatMessageData.imageMessage && !fs.existsSync(path))
                                            oldimage = (oldChatMessageData.imageMessage) ? await conn.downloadAndSaveMediaMessage(oldChat, `./src/images/${oldChat.key.id}`) : "";
                                        let oldmessage = "";
                                        if (oldChatMessageData.conversation)
                                            oldmessage = oldChatMessageData.conversation;
                                        else if (oldChatMessageData.imageMessage)
                                            oldmessage = oldChatMessageData.imageMessage.caption;
                                        else if (oldChatMessageData.extendedTextMessage)
                                            oldmessage = oldChatMessageData.extendedTextMessage.text;
                                        let oldtype = "";
                                        if (oldChatMessageData.conversation)
                                            oldtype = "New MSG";
                                        else if (oldChatMessageData.imageMessage)
                                            oldtype = "IMG MSG";
                                        else if (oldChatMessageData.extendedTextMessage) {
                                            if (!oldChatMessageData.extendedTextMessage.contextInfo.quotedMessage)
                                                oldtype = "Mentioned MSG";
                                            else if (oldChatMessageData.extendedTextMessage.contextInfo.quotedMessage) {
                                                oldtype = "Reply MSG";
                                            }
                                        }
                                        results[oldChat.key.id] = { date: olddate, type: oldtype, from: oldfrom, message: oldmessage, image: oldimage, reply: reply_messages };
                                    }
                                    break;
                                }

                            }

                        }
                    }
                    else
                        results[id] = { date, type, from, message, image };
                    // console.log(message_data);
                }
            }
            const genPDF = new GeneratePDF(results);
            genPDF.generate();
            console.log("Done!!");

        });
    });
};

findDate();
// });  