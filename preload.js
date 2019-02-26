// in preload scripts, we have access to node.js and electron APIs
// the remote web app will not have access, so this is safe
const { ipcRenderer: ipc, remote } = require('electron');
// library para notificar em todas as maquinas
const notifier = require("node-notifier");
// controlador de caminhos
const path = require('path');
// verifica se está em dev
const isDev = require('electron-is-dev');

// caminho para o icone
const icon = path.join(__dirname, 'assets/logo.png');

const uuid = require('uuid/v1');

var lastNotification = 0;
var notificationAttempts = [];

/**
 * Inicializa as funcionalidades do webview do app
 */
function init() {
  // expõe as funções da API interna do electron,
  // essas funções devem ter ações específicas e não devem expor objetos do electron.
  window.Bridge = {
    setDockBadge: setDockBadge,
    notifyDesktop: notifyDesktop,
    setActive: setActive,
    setInactive: setInactive,
  };

  // we get this message from the main process
  ipc.on('on-force-reset', () => {
    window.Bridge.forceReset();
  });

  // we get this message from the main process
  ipc.on('on-active', () => {
    window.Bridge.emitActive && window.Bridge.emitActive();
  });

  // we get this message from the main process
  ipc.on('on-inactive', () => {
    window.Bridge.emitInactive && window.Bridge.emitInactive();
  });
}

async function setActive() {
  await ipc.send('set-active')
}

async function setInactive() {
  await ipc.send('set-inactive')
}

/**
 * Efetua a atualização da contagem do dock
 * @param {String} count valor a ser colocado no dock
 */
function setDockBadge(count) {
  switch(process.platform) {
    case 'darwin': // Mac OS
      // atualiza a contagem de mensagens pendentes no dock
      remote.app.dock.setBadge(`${count||''}`);
      // se a contagem for diferente de 0
      if(parseInt(count, 0) !== 0) {
        // agita o dock para avisar de uma nova mensagem
        remote.app.dock.bounce('informational');
      }
      break;
    case 'win32': // Windows
      // atualiza a contagem do badge do windows, se for 0 some
      ipc.sendSync('update-badge', count);
      break;
  }
}

/**
 * Efetua a notificação em qualquer desktop
 * @param {String} title Titulo da notificação
 * @param {String} body Conteúdo da notificação
 * @param {String} sala_id Identificador da sala que gerou a notificação
 */
async function notifyDesktop(title, body, sala_id) {
  // limpa os listeners de eventos
  notifier.removeAllListeners();
  // instancia as configurações da notificação
  const notificationSettings = {message: body, title: title, sound: true, timeout: 5, icon: icon};
  // se for windows
  if(process.platform === 'win32') {
    // deve aguardar uma resposta
    notificationSettings.wait = true;
    // se estiver em produção
    if(!isDev) {
      notificationSettings.appID = 'br.com.finer.ftalk';
    }
  }
  // instancia uma notificação
  notifier.notify(notificationSettings);
  // ao clicar na notificação, abre a conversa
  notifier.once('click', () => {
    // abre o chat, se estiver fechado.
    remote.app.focus();
    // se a plataforma for windows
    if(process.platform === 'win32') {
      // envia uma mensagem solicitando foco na tela
      ipc.send('window-focus');
    }
    // chama uma função do chat para abrir a sala
    window.Bridge.openRoom(sala_id);
  });
}

// inicializa a ponte
init();