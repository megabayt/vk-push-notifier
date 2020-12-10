const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const admin = require("firebase-admin");

const serviceAccount = require("./vk-messenger-flutter-firebase-adminsdk-pms5f-f56dc9b70c.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vk-messenger-flutter.firebaseio.com"
});

const vkTransport = axios.create({
  baseURL: "https://api.vk.com/method",
});

const app = express();
const port = 3001;

app.use(bodyParser.json());

let interval;
let processing = false;
let vkToken;
let phoneToken;
let lastMessageId;

app.post('/', (req, res) => {
  if (interval) {
    clearInterval(interval);
  }
  vkToken = req.body.vkToken;
  phoneToken = req.body.phoneToken;
  console.log('new params!');
  console.log(req.body);
  processMessages();
  setInterval(processMessages, 5000); 
  res.send('ok');
});

app.listen(port, () => {
  console.log(`VkPush app listening at http://localhost:${port}`)
});

const processMessages = async () => {
  try {
    if (processing) {
      return;
    }
    await (async () => {
      const { data: { response, error } } = 
        await vkTransport.get(`/messages.getConversations?offset=0&count=1&access_token=${vkToken}&v=5.126`);
      if (error) {
        return;
      }
      const item = response && response.items.length && response.items[0];
      if (item.last_message.id === lastMessageId) {
        return;
      }
      if (item && item.conversation.unread_count) {
        await admin.messaging().send({
          token: phoneToken,
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
    })();
    processing = true;
    await processMessages();
  } catch (e) {
    console.error(e.message);
  }
  processing = false;
};
