// Winch speed value (private)
let _speed = 0;

// Getters and setters for speed property
Object.defineProperty(window, 'speed', {
    get: function () {return _speed;},
    set: function (value) {
        // Change private property
        _speed = value;

        // Send speed value to main process
        electronAPI.sendSpeed(value);
        
        // Update input element in html
        const input = document.querySelector('#speed');
        input.innerHTML = _speed.toFixed(1);
    }
});

// Setup button
document.querySelector('#setup').addEventListener('click', () => {
    electronAPI.setup();
});

// connected global variable variable
let connected = false;

// Connect button
document.querySelector('#connect').addEventListener('click', async () => {
    const err = await electronAPI.connect();
    
    // Show modal in case of error
    if (err) {
        showError(err);
    }

    // Switch to connected layout
    else {
        connected = true;

        document.querySelector('#connect').classList.add('connected');
        document.querySelector('#disconnect').classList.add('connected');

        for (arrow of document.querySelectorAll('.arrow')) {
            arrow.classList.add('connected');
        }
    }
});

// Disconnect button
document.querySelector('#disconnect').addEventListener('click', async () => {
    await electronAPI.disconnect();

    // Switch to disconnected layout
    connected = false;

    document.querySelector('#connect').classList.remove('connected');
    document.querySelector('#disconnect').classList.remove('connected');

    for (arrow of document.querySelectorAll('.arrow')) {
        arrow.classList.remove('connected');
    }
});

// Write error event listener
electronAPI.handleError((event, err) => {
    showError(err);
});

// Double up-arrow
document.querySelector('#double-up-arrow').addEventListener('mousedown', () => holdSpeed(2));

// Up-arrow
document.querySelector('#up-arrow').addEventListener('mousedown', () => holdSpeed(1));

// Down-arrow
document.querySelector('#down-arrow').addEventListener('mousedown', () => holdSpeed(-1));

// Double down-arrow
document.querySelector('#double-down-arrow').addEventListener('mousedown', () => holdSpeed(-2));

const myModal = new bootstrap.Modal(document.querySelector('#error'), {});

// Show error modal
function showError(err) {
    const message = document.querySelector('#error-message');
    message.innerHTML = err.message || 'Could not establish connection with PLC.';
    myModal.toggle();
}

function holdSpeed(value) {
    if (connected) {
        speed = value;
        document.body.addEventListener('mouseup', resetSpeed);
    }
}

function resetSpeed() {
    speed = 0;
    document.body.removeEventListener('mouseup', resetSpeed);
}