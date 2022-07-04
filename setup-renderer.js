// Show previously saved address
requestConfig();

// Setup form on submit
document.querySelector('#setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Save settings in config object
    let config = {
        ip: e.currentTarget.elements['plc-ip'].value,
        winch: e.currentTarget.elements['winch-address'].value
    }

    // Send object to main proccess
    const err = await electronAPI.save(config);
    
    const myModal = new bootstrap.Modal(document.querySelector('#saveError'), {});
    // Show modal in case of error
    if (err) {
        const message = document.querySelector('#error-message');
        message.innerHTML = err.message || 'It was not possible to save changes.';
        myModal.toggle();
    }

    // Close window otherwise
    else electronAPI.close();
});

// Cancel button
document.querySelector('#cancel').addEventListener('click', () => {
    electronAPI.close();
});

// Request connection settings from main proccess
async function requestConfig () {
    config = await electronAPI.requestConfig();

    // Ensure all settings are defined
    console.log(config);
    if (config === null || config.ip === null && config.winch === null) alert('Warning: Connection settings not defined!', 'warning');
    else if (config.ip === null) alert('Warning: PLC\'s IP address not defined!', 'warning');
    else if (config.winch === null) alert('Warning: Winch\'s output address not defined!', 'warning');
    
    // Fill previous settings on form
    else {
        document.querySelector('#plc-ip').value = config.ip;
        document.querySelector('#winch-address').value = config.winch;
    }
}

// Create alert component
function alert(message, type) {
    const alertPlaceholder = document.querySelector('#alert-placeholder');
    const wrapper = document.createElement('div')

    wrapper.innerHTML = [
      `<div class="alert alert-${type} alert-dismissible" role="alert">`,
      `   <div>${message}</div>`,
      '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
      '</div>'
    ].join('')
  
    alertPlaceholder.append(wrapper)
}