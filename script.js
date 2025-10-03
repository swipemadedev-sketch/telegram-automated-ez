// Initialize the Telegram Web App object
const tg = window.Telegram.WebApp;

// Get form elements
const form = document.getElementById('ticket-form');
const subjectInput = document.getElementById('subject');
const descriptionInput = document.getElementById('description');

// --- Main Button Configuration ---

// Set the text of the main button
tg.MainButton.text = "Submit Ticket";
// Make the main button visible
tg.MainButton.show();

// This function is called when the user clicks the main button
tg.MainButton.onClick(() => {
    // Check if the form is valid (all required fields are filled)
    if (!form.checkValidity()) {
        tg.showAlert('Please fill out all fields.');
        return;
    }

    // Create the data object to send to the bot
    const data = {
        subject: subjectInput.value,
        description: descriptionInput.value,
    };

    // Use WebApp.sendData() to send data to the bot.
    // This will trigger a 'web_app_data' event on the backend.
    tg.sendData(JSON.stringify(data));
    
    // The Mini App will be closed automatically after sendData is called.
});
