const axios = require('axios');
const credentials = require('./credentials.json');
const admin = require("firebase-admin");

const serviceAccount = require("./vk-messenger-flutter-firebase-adminsdk-pms5f-f56dc9b70c.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vk-messenger-flutter.firebaseio.com"
});

const vkTransport = axios.create({
  baseURL: "https://api.vk.com/method",
});

let processing = false;
let lastMessageId;

const init = async () => {
  try {
    if (processing) {
      return;
    }
    processing = true;
    await processMessages();
  } catch (e) {
    console.error(e.message);
  }
  processing = false;
};

const processMessages = async () => {
  const { data: { response, error } } = await vkTransport.get(`/messages.getConversations?offset=0&count=1&access_token=${credentials.vktoken}&v=5.126`);
  if (error) {
    return;
  }
  const item = response && response.items.length && response.items[0];
  console.log(item.last_message.id, lastMessageId);
  if (item.last_message.id === lastMessageId) {
    return;
  }
  if (item && item.conversation.unread_count) {
    await admin.messaging().send({
      token: credentials.phonetoken,
      notification: {
        title: "Новое сообщение",
        body: item.last_message.text,
      },
      // Set Android priority to "high"
      android: {
        priority: "high",
      },
    });
    lastMessageId = item.last_message.id;
  }
}

init();
setInterval(init, 5000);
