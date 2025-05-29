import { writable } from 'svelte/store';
// We will need to ensure qewd-client.js is accessible from this path
// For example, by copying it into the same directory or configuring Rollup resolution
import { QEWD } from 'qewd-client'; 

// Store for connection status
export const isConnected = writable(false);
export const qewdSession = writable(null); // Will store QEWD instance or relevant session info

// Store for generic messages from QEWD that aren't direct responses
export const qewdMessages = writable(null); 

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

// let qewdClientInstance = null; // QEWD object itself will be the instance

export const qewdStore = {
  connect: (config) => {
    // qewd-client.js start method doesn't return the instance directly,
    // it modifies the imported QEWD object.
    // It also doesn't check for existing connections in the same way, 
    // but relies on internal state of the socket.
    // We'll assume QEWD.start() can be called and it handles reconnection logic if necessary.

    console.log('QEWD Store: Attempting to connect with config:', config);
    QEWD.start(config); // QEWD is modified in place by its start method

    QEWD.on('ewd-registered', () => {
      console.log('QEWD Store: ewd-registered event received');
      isConnected.set(true);
      // Store the QEWD object itself or specific session parts. 
      // QEWD.application and QEWD.jwt (getter) are available.
      qewdSession.set({
        application: QEWD.application,
        get jwt() { return QEWD.jwt; } // Provide access to the JWT getter
      }); 
    });

    QEWD.on('ewd-reregistered', () => {
      console.log('QEWD Store: ewd-reregistered event received');
      isConnected.set(true);
      // Potentially update session info if needed
      qewdSession.set({
        application: QEWD.application,
        get jwt() { return QEWD.jwt; }
      });
    });

    QEWD.on('socketDisconnected', () => {
      console.log('QEWD Store: socketDisconnected event received');
      isConnected.set(false);
      qewdSession.set(null);
    });

    QEWD.on('error', (error) => {
      console.error('QEWD Store: QEWD error event:', error);
      // You might want to set isConnected to false or handle specific errors
      // qewd-client itself might emit disconnect on certain errors.
    });

    // Generic handler for all messages. 
    // qewd-client.js emits specific types directly, so a generic 'qewd-message' might not be standard.
    // However, QEWD.on(type, callback) is the primary way to get responses to QEWD.send or server-initiated messages.
    // This part might need adjustment based on how you expect to receive non-response messages.
    // For now, we'll assume specific listeners are registered via qewdStore.on()
  },

  sendMessage: async (type, params) => {
    // Use QEWD.reply for a Promise-based approach
    if (!QEWD.application) { // Check if QEWD has been started/registered
      console.error('QEWD Store: Not connected. Cannot send message.');
      throw new Error('QEWD Store: Not connected.');
    }
    
    const message = {
      type: type,
      params: params
      // token is handled internally by qewd-client.js
    };

    console.log('QEWD Store: Sending message:', message);
    try {
      // QEWD.reply is an async function that returns a promise
      const response = await QEWD.reply(message);
      console.log('QEWD Store: Response from QEWD.reply:', response);
      // The response from QEWD.reply is the message object from the server.
      // If it contains an error property, it should be treated as a rejection.
      if (response.message && response.message.error) {
        throw response.message; // Throw the error part of the message
      }
      return response; // Resolve with the full response message object
    } catch (error) {
      console.error('QEWD Store: Error sending message via QEWD.reply:', error);
      throw error; // Re-throw the error to be caught by the caller
    }
  },

  // Allows components to register handlers for specific message types
  on: (messageType, callback) => {
    if (QEWD.on) {
      console.log(`QEWD Store: Registering listener for message type: ${messageType}`);
      QEWD.on(messageType, callback);
    } else {
      console.warn('QEWD Store: Cannot register listener, QEWD.on is not available. Has QEWD.start been called?');
    }
  },

  // Expose QEWD session directly if needed (provides application name and jwt getter)
  getSession: () => {
    if (!QEWD.application) return null;
    return {
      application: QEWD.application,
      get jwt() { return QEWD.jwt; }
    };
  },

  // Disconnect function
  disconnect: () => {
    if (QEWD.disconnectSocket) {
      QEWD.disconnectSocket();
      console.log('QEWD Store: Manually disconnected.');
    }
    isConnected.set(false);
    qewdSession.set(null);
  }
};

// Auto-connect example (optional, remove if you want to connect manually from a component)
// qewdStore.connect({
//   application: 'hellosvelte', // Your app name
//   url: 'http://127.0.0.1:8080', // Your QEWD server URL
//   log: true // Enable qewd-client logging
//   // jwt: true, // if you are using JWT
//   // jwt_decode: function(token) { /* return decoded token */ } // if you want QEWD.jwt to be the decoded token
// });
