// Initialize the Telegram Web App
const tg = window.Telegram.WebApp;

// Get the form element
const form = document.getElementById('ticket-form');
const subjectInput = document.getElementById('subject');
const descriptionInput = document.getElementById('description');

// Configure the Main Button
tg.MainButton.text = "Submit Ticket";
tg.MainButton.show();

// Event listener for the Main Button
tg.MainButton.onClick(() => {
    // Check if form is valid
    if (!form.checkValidity()) {
        tg.showAlert('Please fill out all fields.');
        return;
    }

    // Create the data object to send
    const data = {
        subject: subjectInput.value,
        description: descriptionInput.value
        // Telegram will automatically send user data along with this
    };

    // Use WebApp.sendData() to send the data to the bot
    // This data will be available in the 'web_app_data' field of the update
    tg.sendData(JSON.stringify(data));

    // After sending data, you can close the Mini App
    tg.close();
});