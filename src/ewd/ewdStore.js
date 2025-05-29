import { writable } from 'svelte/store';
import EWD from 'ewd-client'; // Assumes ewd-client is installed via npm/bun

// Store for connection status
export const isConnected = writable(false);
export const ewdSession = writable(null);

// Store for generic messages from QEWD that aren't direct responses
export const ewdMessages = writable(null); 

// Store for specific message types you want to subscribe to
const messageStores = new Map();

function getMessageStore(type) {
  if (!messageStores.has(type)) {
    messageStores.set(type, writable(null));
  }
  return messageStores.get(type);
}

export function subscribeToMessageType(type) {
  return getMessageStore(type);
}

let ewdClientInstance = null;

export const ewdStore = {
  connect: (config) => {
    if (ewdClientInstance && ewdClientInstance.socket && ewdClientInstance.socket.connected) {
      console.log('EWD Store: Already connected.');
      isConnected.set(true);
      return;
    }

    console.log('EWD Store: Attempting to connect with config:', config);
    ewdClientInstance = EWD.start(config);

    EWD.on('ewd-registered', () => {
      console.log('EWD Store: ewd-registered event received');
      isConnected.set(true);
      ewdSession.set(EWD.session); // Store the session object
    });

    EWD.on('socketDisconnected', () => {
      console.log('EWD Store: socketDisconnected event received');
      isConnected.set(false);
      ewdSession.set(null);
    });

    EWD.on('error', (error) => {
      console.error('EWD Store: EWD error event:', error);
      // You might want to set isConnected to false or handle specific errors
    });

    // Generic handler for all messages (optional, for debugging or specific use cases)
    // This will catch messages that are not handled by EWD.on('specificType', ...)
    // if qewd-client itself uses a wildcard or similar internal mechanism.
    // More typically, you subscribe to specific types you expect.
    EWD.on('ewd-message', (message) => {
        console.log('EWD Store: Received generic ewd-message:', message);
        ewdMessages.set(message); // Update the generic message store

        // If you want to route messages to specific stores by type here:
        if (message.type && messageStores.has(message.type)) {
            const store = messageStores.get(message.type);
            store.set(message.message || message); // Assuming payload is in message.message or is the message itself
        }
    });
  },

  sendMessage: (type, params) => {
    return new Promise((resolve, reject) => {
      if (!ewdClientInstance || !EWD.session || !EWD.session.token) {
        console.error('EWD Store: Not connected or no session token. Cannot send message.');
        return reject(new Error('EWD Store: Not connected or no session token.'));
      }
      
      const message = {
        type: type,
        params: params,
        // token: EWD.session.token // ewd-client handles token internally
      };

      console.log('EWD Store: Sending message:', message);
      EWD.send(message, (response) => {
        console.log('EWD Store: Response to send:', response);
        if (response.error) {
          reject(response);
        } else {
          resolve(response);
        }
      });
    });
  },

  // Allows components to register handlers for specific message types
  on: (messageType, callback) => {
    if (ewdClientInstance) {
      console.log(`EWD Store: Registering listener for message type: ${messageType}`);
      EWD.on(messageType, callback);
    } else {
      console.warn('EWD Store: Cannot register listener, EWD client not initialized.');
    }
  },

  // Expose EWD session directly if needed
  getSession: () => EWD.session,

  // Disconnect function
  disconnect: () => {
    if (ewdClientInstance && ewdClientInstance.socket && ewdClientInstance.socket.connected) {
      ewdClientInstance.socket.disconnect();
      console.log('EWD Store: Manually disconnected.');
    }
    isConnected.set(false);
    ewdSession.set(null);
    // ewdClientInstance = null; // Optionally nullify the instance
  }
};

// Auto-connect example (optional, remove if you want to connect manually from a component)
// ewdStore.connect({
//   application: 'hellosvelte', // Default or your app name
//   url: 'http://localhost:8080',
//   ws_url: 'ws://localhost:8080'
// });
