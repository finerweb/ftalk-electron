
// renderizador do electron
const {ipcRenderer:ipc} = require('electron');
// objeto da webview
const $webview = document.querySelector('webview');
// objeto do loader
const $loader = document.querySelector('.loader');
// define houve ou não o carregamento inicial
let isInitialLoad = true;
// coleta a versão do chat
let version = window.location.hash.substring(1);
// define o titulo da aplicação
let title = `${document.title} v${version}`;
// atualiza a versão do chat no titulo da janela
document.title = title;


// roda quando a webview inicia o carregamento do conteúdo
$webview.addEventListener('did-start-loading', () => {
  // atualiza o loader somente o carregamento inicial
  if(isInitialLoad) {
    // esconde a webview
    $webview.classList.add('hide');
    // mosta o loader
    $loader.classList.remove('loader-hide');
    // define que já rodou o carregamento inicial
    isInitialLoad = false;
  }
});

// roda quando a webview terminou de carregar o conteúdo.
$webview.addEventListener('dom-ready', () => {
  // mostra a webview
  $webview.classList.remove('hide');
  // aguarda a webview se normalizar
  setTimeout(() => {
    // esconde o loader
    $loader.classList.add('loader-hide');
  }, 100);
});

// roda quando o dev tools é solicitado no menu
ipc.on('on-dev-tools', () => {
  // abre o dev tools da webview
  $webview.openDevTools();
});

// roda quando uma atualização estiver disponível
ipc.on('update-available', () => {
  // coleta o nome do documento
  let documentTitle = (title||document.title);
  // atualiza o nome do documento
  document.title = `${documentTitle} -> Atualização Disponível`;
});

// roda quando uma atualização estiver disponível
ipc.on('update-progress', (event, {progress, downloadRate}) => {
  // coleta o nome do documento
  let documentTitle = (title||document.title);
  // atualiza o nome do documento
  document.title = `${documentTitle} -> Baixando (${progress}% - Velocidade: ${downloadRate})`;
});

// roda quando uma atualização estiver disponível
ipc.on('update-complete', () => {
  // atualiza o nome do documento
  document.title = title;
});