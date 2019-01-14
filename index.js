// importa o electron
const electron = require('electron');
// modulo para criar um badge no windows
const windowsBadge = require('electron-windows-badge');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// utilizado para controlar os caminhos
const path = require('path');
// logger de atualização
const log = require('electron-log');
// atualizador
const autoUpdate = require('./auto-updater');
// auto inicializadoe
const autoLaunch = require('./auto-launch');

// informa que o app esta inicializando
log.info('App starting...');

// inicializa o auto inicializador
autoLaunch();

// manter mainWindow sempre global
var mainWindow;

/**
 * Efetua um hard-reset na webview, caso haja algum erro irreparavel.
 */
const onForceReset = () => {
	// emite um evento para todos os webcontents
	electron.webContents.getAllWebContents().forEach(wc => wc.send('on-force-reset'));
}

const onAbrirDevTools = () => {
	electron.webContents.getAllWebContents().forEach(wc => wc.send('on-dev-tools'));
	mainWindow.openDevTools();
}

/**
 * Efetua a criação do menu do app
 */
const createMenu = () => {
	// efetua a criação de um novo menu no app
	electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate([
		{
			label: 'Editar',
			submenu: [
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'pasteandmatchstyle' },
				{ role: 'delete' },
				{ role: 'selectall' }
			]
		},
		{
			label: 'Opções',
			submenu: [
				{ label: 'Forçar Reset do App', click: onForceReset },
				{ label: 'Abrir Dev Tools', click: onAbrirDevTools },
			],
		}
	]));
}

/**
 * Efetua a criação de uma nova janela do chat
 */
const createWindow = () => {
	// instancia as configurações da janela
	const windowSettings = {
		name: 'FTALK',
		minWidth:800, 
		minHeight:600,
		icon: path.join(__dirname, 'build', 'icon.ico')
	};
	// cria a janela, baseada nas configurações
	mainWindow = new BrowserWindow(windowSettings);
	// se a plataforma for windows
	if(process.platform === 'win32') {
		// instancia um badge
		new windowsBadge(mainWindow, {});
	}
	// carrega o arquivo index do app
	mainWindow.loadURL(path.join('file://', __dirname, `index.html#${app.getVersion()}`));
	// quando a janela for fechada
	mainWindow.on('closed', () => {
		// efetua o fechamento do app
		mainWindow = null;
	});
	// caso solicite o foco na janela
	electron.ipcMain.on('window-focus', () => {
		// windows
		mainWindow.show();
	})
	// inicializa o menu
	createMenu();	
	// inicializa o atualizador
	autoUpdate();
}

// quando o electron estiver pronto, inicializa a janela
app.on('ready', createWindow);

// fecha o app quando todas as janelas forem fechadas
app.on('window-all-closed', () => {
	// no OSX, o app só fecha quando o usuário manualmente fechar o app.
	if (process.platform !== 'darwin') {
		// em outras plataformas, fecha normalmente
		app.quit();
	}
});

// ao abrir o app novamente, se não tiver nenhuma janela aberta, cria ela novamente.
app.on('activate', function () {
	// se não tiver nenhuma janela
	if (mainWindow === null) {
		// cria a janela novamente
		createWindow();
	}
});