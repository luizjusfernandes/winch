const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const nodes7 = require('nodes7');

let conn = new nodes7;

// PLC constants
const maxOut = 27468;
const speedRange = 2.0;

// Global BrowserWindow variables
let mainWin;
let setupWin;

const createWindow = () => {
    mainWin = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWin.loadFile('index.html');

    // Quit app if main window is closed
    mainWin.addListener('closed', () => {
        app.quit();
    })

    // Define setup event listener
    ipcMain.on('setup', createSetupWindow);

    // Define connect event listener
    ipcMain.handle('connect', async () => {
        let config = await readConfig();
        
        // Request config set-up if not all settings are defined
        if (config === null || config.ip === null || config.winch === null) {
            return new Error('Error: Connection settings not defined!');
        }
        
        // Initiate connection on specified IP
        try {
            await connect(config);
            mainWin.setTitle('Winch Controller (connected)');
        }
        catch (err) {
            return err;
        }

        // Set tag translation for WINCH
        let translation = {
            WINCH: config.winch
        }
        conn.setTranslationCB((tag) => {return translation[tag]});
    });

    // Define disconnect event listener
    ipcMain.handle('disconnect', async () => {
        await disconnect();
        mainWin.setTitle('Winch Controller');
    })

    // Define send-speed event listener
    ipcMain.on('sendSpeed', setSpeed);

    // Define config request event listener
    ipcMain.handle('requestConfig', readConfig);

    // Define save event listener
    ipcMain.handle('save', async (event, config) => {
        
        // Ensure PLC's IP address is valid
        if (!validateIP(config.ip)) return new Error('Invalid IP address');

        // Ensure winch address is valid
        if (!validateMemAddress(config.winch)) return new Error('Invalid output address');

        // Write file with new config
        try {
            await fs.promises.writeFile('config.json', JSON.stringify(config));
            await fs.promises.appendFile('config.json', '\n');
        }
        catch (err) {
            return err;
        }
    });

    // Define close-window event listener
    ipcMain.on('close', (event) => {
        const webContents = event.sender;
        const win = BrowserWindow.fromWebContents(webContents);
        win.close();
    });

    // Request config set-up if not all settings are defined
    readConfig().then((config) => {
        if (config === null || config.ip === null || config.winch === null) createSetupWindow();
    });
}

// Create setup window or maximize it if already exists
const createSetupWindow = () => {
    if (setupWin === undefined) {
        setupWin = new BrowserWindow({
            width: 500,
            height: 600,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js')
            }
        });
    
        setupWin.loadFile('setup.html');

        // Delete reference to window if closed
        setupWin.addListener('closed', () => {
            setupWin = undefined;
        })
    }
    else {
        setupWin.focus();
    }
}

// Read config.json for output address
const readConfig = async () => {
    try {
        // Read file
        data = await fs.promises.readFile('config.json');
        const config = JSON.parse(data); 
        
        // Ensure PLC's IP address is valid
        if (!validateIP(config.ip)) config.ip = null;

        // Ensure winch address is valid
        if (!validateMemAddress(config.winch)) config.winch = null;
        
        return config;
    }
    catch {
        return null;
    }
}

// Validate PLC's IP addresss
const validateIP = (address) => {
    if (address.search('^(([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$') === -1) {
        return false;
    }
    
    return true;

}

// Validate winch's memory address
const validateMemAddress = (address) => {
    if (address.search('^QW[1-9]$|^QW0[1-9]$|^QW[1-9][0-9]$') === -1) {
        return false;
    }

    return true;
}

const connect = (config) => {
    return new Promise((resolve, reject) => {
        conn.initiateConnection({ port: 102, host: config.ip }, (err) => {
            if (typeof(err) !== undefined) {
                reject(err);
            }

            resolve();
        });
    });
}

const disconnect = () => {
    return new Promise((resolve) => {
        conn.dropConnection(() => {
            resolve();
        });
    });
}

// Set new speed in PLC
const setSpeed = async (event, speed) => {
    let out = (speed / speedRange) * maxOut;

    if (out < 0) out = 0;
    else if (out > maxOut) out = maxOut; 

    conn.writeItems('WINCH', out, (anythingBad) => {
        if (anythingBad) {
            mainWin.webContents.send('writeError', new Error('Lost connection to PLC.'));
        }
    });
}

app.whenReady().then(() => {
    // Define a Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src 'self'; script-src 'self'; img-src * 'self' data: https:"]
            }
        })
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});