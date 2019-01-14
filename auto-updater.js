// importa o electron
const electron = require('electron');
// logger de atualização
const log = require('electron-log');
// atualizador
const {autoUpdater} = require("electron-updater");
// temporizador de atualização
const UPDATE_TIME = 60000;
// define se está ou não atualizando
let updating = false;

// inicializa o logger do electron para o auto updater
autoUpdater.logger = log;
// seta para fazer o log dos arquivos
autoUpdater.logger.transports.file.level = 'info';

function sendToWindow(message, content) {
	electron.webContents.getAllWebContents().forEach(wc => wc.send(message, content));
}

// roda quando está buscando por atualizações
autoUpdater.on('checking-for-update', () => {
  // envia uma mensagem para as janelas
  sendToWindow('message', 'Checking for update...');
});

// roda quando uma atualização esta disponível
autoUpdater.on('update-available', (info) => {
  // atualiza o estado da aplicação para atualizando
  updating = true;
  // informa as janelas de que há uma nova atualização
  sendToWindow('update-available');
});

// roda quando há um erro na atualização
autoUpdater.on('error', (err) => {
  // atualiza o estado da aplicação para não mais atualizando
  updating = false;
  // informa as janelas de que houve um erro
  sendToWindow('message', 'Error in auto-updater. ' + err);
});

// roda quando há algum progresso no download da atualização
autoUpdater.on('download-progress', (progressObj) => {
  // informa as janelas sobre a nova atualização
  sendToWindow('update-progress', {
    // progresso do download, em %
    progress:parseFloat(progressObj.percent).toFixed(2),
    // velocidade em megabytes do download
		downloadRate:parseFloat(progressObj.bytesPerSecond/1024).toFixed(2),
  });
});

//
autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  // informa as janelas de que a atualização foi completada com sucesso
  sendToWindow('update-complete');
  // opções do dialogo
	const dialogSettings = {
    // tipo do dialogo
    type: 'info',
    // botões de ação
    buttons: ['Reiniciar o Chat e Instalar'],
    // titulo do dialogo
    title: 'Atualização de Software',
    // notas de lançamento
    message: process.platform === 'win32' ? releaseNotes : releaseName,
    // detalhe do dialogo
    detail: 'Uma nova versão do software esta disponível, Deseja instalar?'
  }
  // mostra uma mensagem avisando sobre a nova atualização
  electron.dialog.showMessageBox(dialogSettings, (response) => {
    // se o usuário escolheu reiniciar o chat
    if (response === 0) {
      // fecha o app e instala a atualização
      autoUpdater.quitAndInstall();
    } else {
      // caso contrário, marca para atualizar quando fechar
      autoUpdater.autoInstallOnAppQuit && autoUpdater.autoInstallOnAppQuit(); 
    }
	});
});

module.exports = () => {
	// verifica uma primeira vez se tem atualização
	autoUpdater.checkForUpdatesAndNotify();
	// verifica atualização a cada 1 minuto
	setInterval(() => {
    // se não estiver atualizando já
		if(!updating) {
      // verifica atualização
			autoUpdater.checkForUpdatesAndNotify();
		}
	}, UPDATE_TIME);
}