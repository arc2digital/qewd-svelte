<script>
  import { onMount } from 'svelte';
  // Update the import to use qewdStore and its exports
  import { qewdStore, isConnected, subscribeToMessageType } from './stores/qewdStore.js';

  export let name;

  let messageText = 'Svelte';
  let responseText = '';
  let connectError = null;

  // Subscribe to a specific message type if your backend sends one you want to react to
  // For this example, we'll primarily use the direct response from sendMessage
  // const greetingResponse = subscribeToMessageType('greetingResponse'); // Example

  onMount(() => {
    console.log('App.svelte onMount: Attempting to connect...');
    // Ensure the URL points to your QEWD server and the hellosvelte app
    // Use 127.0.0.1 for Safari if localhost causes issues
    qewdStore.connect({ // Changed from ewdStore
      application: 'hellosvelte', 
      url: 'http://127.0.0.1:8080', // Or your QEWD server URL
      ws_url: 'ws://127.0.0.1:8080'  // Or your QEWD server WebSocket URL
    });

    // Optional: Handle connection errors if the store exposes them or through a timeout
    setTimeout(() => {
      if (!$isConnected) {
        connectError = 'Failed to connect to QEWD server. Please ensure it is running and accessible.';
        console.error(connectError);
      }
    }, 5000); // 5 second timeout for connection
  });

  async function sendMessageToServer() {
    if (!$isConnected) {
      responseText = 'Not connected to server.';
      console.log('sendMessageToServer: Not connected.');
      return;
    }
    if (!messageText.trim()) {
      responseText = 'Please enter text to send.';
      return;
    }

    try {
      console.log(`Sending message with type "hello/testHello" and text: "${messageText}"`);
      // The backend handler /Users/noeldacosta/code/authorsync/qewd/qewd-apps/hellosvelte/hello/index.js 
      // expects type 'testHello' and params.text. The full type for QEWD will be 'hello/testHello' due to folder routing.
      const response = await qewdStore.sendMessage('hello/testHello', { text: messageText }); // Changed from ewdStore
      console.log('Response from server:', response);

      // qewdStore.sendMessage (using QEWD.reply) returns the full message object.
      // If the backend sends { type: '...', message: { actual_payload_field: '...' } }
      // then response.message will contain { actual_payload_field: '...' }
      // The hellosvelte backend handler was updated to send: { message: { message: 'response string' } }
      // So, response.message.message should be correct.
      if (response && response.message && typeof response.message.message === 'string') {
        responseText = response.message.message;
      } else if (response && response.message && response.message.error) { // Check for error in the nested message
        responseText = 'Error: ' + response.message.error;
      } else if (response && response.error) { // Fallback for top-level error
        responseText = 'Error: ' + response.error;
      } else {
        responseText = 'Unexpected response format: ' + JSON.stringify(response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      responseText = 'Error sending message: ' + (error.message || error.error || JSON.stringify(error));
    }
  }

  function disconnectFromServer() {
    qewdStore.disconnect(); // Changed from ewdStore
    responseText = 'Disconnected.';
  }

</script>

<main>
	<h1>Hello {name}!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>

  {#if connectError}
    <p style="color: red;">{connectError}</p>
  {/if}

  <p>Connection Status: {$isConnected ? 'Connected' : 'Disconnected'}</p>

  <div>
    <label for="messageInput">Enter text to send:</label>
    <input id="messageInput" type="text" bind:value={messageText}>
    <button on:click={sendMessageToServer} disabled={!$isConnected}>Send Message</button>
  </div>

  {#if responseText}
    <div>
      <h2>Response from Server:</h2>
      <p>{responseText}</p>
    </div>
  {/if}

  <button on:click={disconnectFromServer} disabled={!$isConnected}>Disconnect</button>

</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

  main {
    font-family: Arial, sans-serif;
    padding: 20px;
    max-width: 600px;
    margin: auto;
  }
  input[type="text"] {
    padding: 8px;
    margin-right: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  button {
    padding: 8px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  div {
    margin-bottom: 15px;
  }
  h2 {
    margin-top: 20px;
  }

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>