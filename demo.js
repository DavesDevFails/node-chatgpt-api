import { ChatGPTClient } from './src/ChatGPTClient.js';

const clientOptions = {
    proxyUrl: "", // REQUIRED! Full URL to the proxy conversation endpoint 
    modelOptions: {
        model: "", // defaults to text-davinci-002-render-sha
    },
    debug: false,
};

// Initialize the API
const sessionToken = ""; // REQUIRED - SESSION TOKEN
const api = new ChatGPTClient(sessionToken, clientOptions);

// Send a request to ChatGPT USING api.sendMessage
const prompt = "write a poem about dogs"
console.log("User:", prompt)
const result = await api.sendMessage(prompt, {
    onProgress: (token) => {
        // uncomment to get stream as it's recieved
        // console.log(token);
    },
});

// Print the response
console.log(result);


// Send another request 
// using the previous response's
// conversationId and messageId
// as the parameters for conversationId & parentMesageId

console.log("Using Conversation ID", result.conversationId)
console.log("Using Parent Message ID", result.messageId)

const prompt2 = "make it shoter and funny"
console.log("User:", prompt2)
const result2 = await api.sendMessage(prompt2, {
    conversationId: result.conversationId,
    parentMessageId: result.messageId,
    onProgress: (token) => {
        // uncomment to get stream as it's recieved
        // console.log(token);
    },
});

// Print the response
console.log(result2);