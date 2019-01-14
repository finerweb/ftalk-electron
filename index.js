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
// inicializador junto com o windows
const AutoLaunch = require('auto-launch');
// verifica se está em desenvolvimento
const isDev = require('electron-is-dev');
// logger de atualização
const log = require('electron-log');
// atualizador
const {autoUpdater} = require("electron-updater");

// inicializa o logger do electron para o auto updater
autoUpdater.logger = log;
// seta para fazer o log dos arquivos
autoUpdater.logger.transports.file.level = 'info';
// informa que o app esta inicializando
log.info('App starting...');

if(process.platform === 'win32') {
	// this should be placed at top of main.js to handle setup events quickly
	if (handleSquirrelEvent(app)) {
		// squirrel event handled and app will exit in 1000ms, so don't do anything else
		return;
	}
}

var updating = false;

function sendStatusToWindow(text) {
  log.info(text);
	electron.webContents.getAllWebContents().forEach(wc => wc.send('message', text));
}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for update...');
})
autoUpdater.on('update-available', (info) => {
	updating = true;
	electron.webContents.getAllWebContents().forEach(wc => wc.send('message', {type:'update-available'}));
})
autoUpdater.on('update-not-available', (info) => {
})
autoUpdater.on('error', (err) => {
	updating = false;
  sendStatusToWindow('Error in auto-updater. ' + err);
})
autoUpdater.on('download-progress', (progressObj) => {
	electron.webContents.getAllWebContents().forEach(wc => wc.send('message', {
		type: 'update-progress',
		progress:parseFloat(progressObj.percent).toFixed(2), 
		downloadRate:parseFloat(progressObj.bytesPerSecond/1024).toFixed(2),
	}));
  // let log_message = "Download speed: " + progressObj.bytesPerSecond;
  // log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  // log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  // sendStatusToWindow(log_message);
})
autoUpdater.on('update-downloaded', (info) => {
	electron.webContents.getAllWebContents().forEach(wc => wc.send('message', {type:'update-complete'}));
	const dialogOpts = {
    type: 'info',
    buttons: ['Reiniciar o Chat e Instalar'],
    title: 'Atualização de Software',
    message: 'Alterações',
    detail: 'Uma nova versão do software esta disponível, Deseja instalar?'
  }

  electron.dialog.showMessageBox(dialogOpts, (response) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
	autoUpdater.autoInstallOnAppQuit();
});

// se for em produção
if(!isDev) {
	// instancia o autoLauncher para inicializar com o sistema
	const autoLauncher = new AutoLaunch({
		name: 'FTALK',
	});
	// verifica se o autolauncher está ativo, se não tiver, ativa.
	autoLauncher.isEnabled().then((isEnabled) => {
		// se não estiver ativo
		if(!isEnabled) {
			// então ativa
			autoLauncher.enable();
		}
	}).catch((err) => {
		// informativo caso de erro
		console.error(err);
	});

}

// manter mainWindow sempre global
var mainWindow;

/**
 * Efetua um hard-reset na webview, caso haja algum erro irreparavel.
 */
const onForceReset = () => {
	// emite um evento para todos os webcontents
	electron.webContents.getAllWebContents().forEach(wc => wc.send('on-force-reset'));
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
							{label: 'Forçar Reset do App', click: onForceReset},
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
	// verifica uma primeira vez se tem atualização
	autoUpdater.checkForUpdatesAndNotify();
	// verifica atualização a cada 1 minuto
	setInterval(() => {
		if(!updating) {
			autoUpdater.checkForUpdatesAndNotify();
		}
	}, 60000);
	// inicializa o dev tools
	mainWindow.openDevTools();	
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


function handleSquirrelEvent(application) {
	if (process.argv.length === 1) {
		return false;
	}

	const ChildProcess = require('child_process');
	const path = require('path');

	const appFolder = path.resolve(process.execPath, '..');
	const rootAtomFolder = path.resolve(appFolder, '..');
	const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
	const exeName = path.basename(process.execPath);

	const spawn = function (command, args) {
		let spawnedProcess, error;

		try {
			spawnedProcess = ChildProcess.spawn(command, args, {
				detached: true
			});
		} catch (error) { }

		return spawnedProcess;
	};

	const spawnUpdate = function (args) {
		return spawn(updateDotExe, args);
	};

	const squirrelEvent = process.argv[1];
	switch (squirrelEvent) {
		case '--squirrel-install':
		case '--squirrel-updated':
			// Optionally do things such as:
			// - Add your .exe to the PATH
			// - Write to the registry for things like file associations and
			//   explorer context menus

			// Install desktop and start menu shortcuts
			spawnUpdate(['--createShortcut', exeName]);

			setTimeout(application.quit, 1000);
			return true;

		case '--squirrel-uninstall':
			// Undo anything you did in the --squirrel-install and
			// --squirrel-updated handlers

			// Remove desktop and start menu shortcuts
			spawnUpdate(['--removeShortcut', exeName]);

			setTimeout(application.quit, 1000);
			return true;

		case '--squirrel-obsolete':
			// This is called on the outgoing version of your app before
			// we update to the new version - it's the opposite of
			// --squirrel-updated

			application.quit();
			return true;
	}
};