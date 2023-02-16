import './fetch-polyfill.js';
import crypto from 'crypto';
import { fetchEventSource } from '@waylaidwanderer/fetch-event-source';

class ChatGPTClient {
    constructor(
        sessionToken,
        options = {},
    ) {
        this.sessionToken = sessionToken;
        this.options = options;
        const modelOptions = options.modelOptions || {};
        this.modelOptions = {
            ...modelOptions,
            action: 'next',
            messages: [
                {
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: {
                        content_type: 'text',
                        parts: []
                    }
                }
            ],
            model: 'text-davinci-002-render-sha',
            parent_message_id: crypto.randomUUID()
        };
    }

    async getCompletion(prompt, conversationId, parentMessageId, onProgress) {
        const modelOptions = { ...this.modelOptions };
        if (typeof onProgress === 'function') {
            modelOptions.stream = true;
        }
        modelOptions.stream = true;
        modelOptions.messages[0].id = crypto.randomUUID();
        modelOptions.messages[0].content.parts[0] = prompt;
        if (conversationId !== undefined && parentMessageId !== undefined){
        modelOptions.conversation_id = conversationId
        modelOptions.parent_message_id = parentMessageId
        }
        const debug = this.options.debug;
        if (debug) {
            console.debug(modelOptions);
        }
        const url = this.options.proxyUrl;
        const opts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.sessionToken}`,
            },
            body: JSON.stringify(modelOptions),
            onMessage: (message) => {
                if(debug) {
                    console.debug(message);
                }
                    if(message.data === '[DONE]') {
                onProgress('[DONE]');
                controller.abort();
                resolve();
                return;
            }
            onProgress(JSON.parse(message.data));
        },

        };
        if (modelOptions.stream) {
            return new Promise(async (resolve, reject) => {
                const controller = new AbortController();
                try {
                    await fetchEventSource(url, {
                        ...opts,
                        signal: controller.signal,
                        async onopen(response) {
                            if (response.status === 200) {
                                return;
                            }
                            if (debug) {
                                console.debug(response);
                            }
                            let error;
                            try {
                                const body = await response.text();
                                error = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
                                error.status = response.status;
                                error.json = JSON.parse(body);
                            } catch {
                                error = error || new Error(`Failed to send message. HTTP ${response.status}`);
                            }
                            throw error;
                        },
                        onclose() {
                            throw new Error(`Failed to send message. Server closed the connection unexpectedly.`);
                        },
                        onerror(err) {
                            if (debug) {
                                console.debug(err);
                            }
                            // rethrow to stop the operation
                            throw err;
                        },
                        onmessage(message) {
                            try {
                            if (debug) {
                                console.debug(message);
                            }
                            if (message.data === '[DONE]') {
                                onProgress('[DONE]');
                                controller.abort();
                                resolve();
                                return;
                            }
                            onProgress(JSON.parse(message.data));
                        }
                        catch(err){
                            console.log(err);
                            throw err;
                        }
                        },
                    });

        } catch (err) {
            reject(err);
        }
    });
}
const response = await fetch(url, opts);
if (response.status !== 200) {
    const body = await response.text();
    const error = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
    error.status = response.status;
    try {
        error.json = JSON.parse(body);
    } catch {
        error.body = body;
    }
    throw error;
}
return response.json();
    }

    async sendMessage(
    message,
    opts = {},
) {
    const conversationId = opts.conversationId || undefined;
    const parentMessageId = opts.parentMessageId || undefined;
    // console.log("\n\nReq Conversation ID: ", conversationId)
    // console.log("Req Parent Message ID: ", parentMessageId)
    const prompt = message;
    let respMessageId;
    let respConvID;
    let reply = '';
    let isFirstProgress = true;
    if (typeof opts.onProgress === 'function') {
        await this.getCompletion(prompt, conversationId, parentMessageId, (message) => {
            if (isFirstProgress) {
                isFirstProgress = false;
                // console.log(message)
                respMessageId = message.message.id;
                respConvID = message.conversation_id;
            }
            if (message === '[DONE]') {
                return;
            }
            const token = message.message.content.parts[0];
            if (this.options.debug) {
                console.debug(token);
            }
            opts.onProgress(token);
            reply = token;
        });
    } else {
        const result = await this.getCompletion(prompt, null);
        if (this.options.debug) {
            console.debug(JSON.stringify(result));
        }
        reply = result.choices[0].text;
    }

    // avoids some rendering issues when using the CLI app
    if (this.options.debug) {
        console.debug();
    }

    reply = reply.trim();

    const replyMessage = {
        id: crypto.randomUUID(),
        parentMessageId: respMessageId,
        conversationId: respConvID,
        // role: 'ChatGPT',
        message: reply,
    };

    return {
        response: replyMessage.message,
        conversationId: replyMessage.conversationId,
        messageId: replyMessage.parentMessageId,
        // id: replyMessage.id // Removed as no need for it when ChatGPT handling conversations.
    };
}

}

export { ChatGPTClient };
export default ChatGPTClient;