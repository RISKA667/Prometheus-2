const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

// Garder une référence globale de l'objet window
let mainWindow;

function createWindow() {
    // Créer la fenêtre du navigateur
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets/icon.ico'),
        show: false,
        titleBarStyle: 'default',
        title: 'Prometheus Legal - BRDN Conseils'
    });

    // Charger index.html
    mainWindow.loadFile('index.html');

    // Afficher la fenêtre quand elle est prête
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Émis quand la fenêtre est fermée
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Configurer le menu
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'Fichier',
            submenu: [
                {
                    label: 'Nouveau Matter',
                    accelerator: 'Ctrl+N',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('showSection("matters")');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quitter',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Navigation',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'Ctrl+D',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('showSection("dashboard")');
                    }
                },
                {
                    label: 'Recherche Globale',
                    accelerator: 'Ctrl+R',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('toggleGlobalSearch()');
                    }
                }
            ]
        },
        {
            label: 'Aide',
            submenu: [
                {
                    label: 'À propos',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'À propos de Prometheus',
                            message: 'Prometheus Legal Management System',
                            detail: 'Version 3.0.1\nBRDN Conseils\n\nSystème de gestion juridique professionnel'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Cette méthode sera appelée quand Electron aura fini de s'initialiser
app.whenReady().then(createWindow);

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});