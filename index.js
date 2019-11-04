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
// modulo para verificar a plataforma
const platform = require('os').platform()
// atualizador
const autoUpdate = require('./auto-updater');
// auto inicializadoe
const autoLaunch = require('./auto-launch');
// controlador de download
const DownloadManager = require("electron-download-manager");
// define um tempo para inatividade do usuário
const AWAY_TIMEOUT = 1800;
// define se está ausente ou não
var away = false;
// define um controlador do timeout
var away_interval = null;

// Módulos para lidar da minimizaçao do tray
const Menu = electron.Menu
const Tray = electron.Tray
// informa que o app esta inicializando
log.info('App starting...');

// inicializa o auto inicializador
autoLaunch();

// Instancia inicialmente os icones
var trayIcon = null
var appIcon = null

// Determina o icone do tray
if (platform == 'darwin') {
	trayIcon = path.join(__dirname, 'assets', 'logo.png')
} else if (platform == 'win32') {
		trayIcon = path.join(__dirname, 'assets', 'logo.ico')
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

/** registra o caminho de download */
DownloadManager.register({
	/** caminho de download */
	downloadFolder: app.getPath("downloads") + "/ftalk-arquivos",
});

/**
 * Efetua a criação de uma nova janela do chat
 */
const createWindow = () => {
	// instancia as configurações da janela
	const windowSettings = {
		name: 'FTALK',
		minWidth:800, 
		minHeight:600,
		icon: trayIcon,
	};
		
	if (process.platform !== 'darwin'){
		// cria o icone para o tray
		appIcon = new Tray(trayIcon)

		// Cria contexto de menu "RightClick" para tray icon
		// Possui dois eventos - 'Restaurar' e 'Sair'
		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Abrir',
				click: () => {
					mainWindow.show();
				}
			},
			{
				label: 'Sair',
				click: () => {
					app.exit(0);
				}
			}
		])

		// Seta titulo para o tray
		appIcon.setTitle('FTalk')

		// Seta toot tip para o tray
		appIcon.setToolTip('FTalk')
	
		// Cria contexto RightClick no menu
		appIcon.setContextMenu(contextMenu)
	
		// Restaurar (abrir) após clicar no ícone
		// se já estiver aberta, minimiza ela para o tray
		appIcon.on('click', () => {
			mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
		})
	}

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

	mainWindow.on('close', (event) => {
		if (process.platform !== 'darwin') {
			event.preventDefault();
			mainWindow.hide();
			return false;
		}
	});
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
	// limpa o timeout
	clearInterval(away_interval);
	// verifica de 1 em 1 segundo se o usuário está ativo
	away_interval = setInterval(() => {
		// monitora a atividade do usuário
		electron.powerMonitor.querySystemIdleTime(time => {
			// se o usuário estiver ativo em um tempo menor do que definido e estiver ausente
			if(time < AWAY_TIMEOUT && away) {
				// informa as telas de que o usuário está ativo
				electron.webContents.getAllWebContents().forEach(wc => wc.send('on-active'));
				// se estiver inativo por um tempo maior do que definido e estiver ativo
			} else if(time > AWAY_TIMEOUT && !away) {
				// informa as telas de que o usuário está ausente
				electron.webContents.getAllWebContents().forEach(wc => wc.send('on-inactive'));
			}
		});
	}, 1000);
}

electron.ipcMain.on('set-active', () => {
	away = false;
})

electron.ipcMain.on('set-inactive', () => {
	away = true;
})

/**
 * Executa a funcionalidade de baixar o arquivo quando solicitado pelo processo.
 */
electron.ipcMain.on('download-file', (e, mensagem_id, url) => {
	/** efetua o download do arquivo */
	DownloadManager.download({
		/** url remota a ser baixada */
		url: url,
		/** sempre ao atualizar o download */
		onProgress: (progress) => {
			/** atualizar o progresso do app */
			electron.webContents.getAllWebContents().forEach(wc => wc.send('on-download-progress', mensagem_id, progress));
		},
	}, (error, info) => {
		/** se tiver erro */
		if (error) {
			/** informa o erro */
			console.log(error);
		} else {
			/** efetua a abertura */
			electron.shell.showItemInFolder(info.filePath);
		}
		/** informa o app que o download terminou */
		electron.webContents.getAllWebContents().forEach(wc => wc.send('on-download-finished', mensagem_id, error, info));
	});
});

// quando o electron estiver pronto, inicializa a janela
app.on('ready', createWindow);

// fecha o app quando todas as janelas forem fechadas
app.on('window-all-closed', (event) => {
	event.preventDefault();
	app.hide();
	return false;
});
// quando minimizar a aplicação apenas esconde
app.on('minimize',function(event){
	// previne que a aplicação seja minimizada
	event.preventDefault();
	// escode a aplicação
	app.hide();
});

// quando for para fechar a aplicação
app.on('close', function (event) {
	// previne que a aplicação feche
	event.preventDefault();
	// esconde a aplicação
	app.hide();
	// informa que não fechou
	return false;
});

// ao abrir o app novamente, se não tiver nenhuma janela aberta, cria ela novamente.
app.on('activate', function () {
	// se não tiver nenhuma janela
	if (mainWindow === null) {
		// cria a janela novamente
		createWindow();
	}
});