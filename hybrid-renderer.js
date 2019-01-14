
const {ipcRenderer} = require('electron');

const $webview = document.querySelector('webview');
const $loader = document.querySelector('.loader');
let isInitialLoad = true;

let title = '';

$webview.addEventListener('did-start-loading', () => {
  // we use client side rendering in the web app, so the loader is only needed on the first page load
  if(isInitialLoad) {
    $webview.classList.add('hide');
    $loader.classList.remove('loader-hide');
    isInitialLoad = false;
  }
});

$webview.addEventListener('dom-ready', () => {
  $webview.classList.remove('hide');
  // have to delay in order for the webview show/resize to settle
  setTimeout(() => {
    $loader.classList.add('loader-hide');
  }, 100);
  // coleta a versão do chat
  let version = window.location.hash.substring(1);
  // atualiza a versão do chat no titulo da janela
  document.title = document.title+' v'+version;
  title = document.title
});

ipcRenderer.on('on-dev-tools', function () {
  $webview.openDevTools();
});

ipcRenderer.on('message', function(event, message) {
  if(typeof message === 'object') {
    switch(message.type) {
      case 'update-progress':
        document.title = (title||document.title)+' -> '+'Baixando ('+(message.progress).toFixed(2)+'% - Velocidade: '+(message.downloadRate).toFixed(2)+')';
      break;
      case 'update-available':
        document.title = (title||document.title)+' -> '+'Atualização Disponível';
      break;
      case 'update-complete':
        document.title = title;
      break;
    }
  } else {
    var $container = document.getElementById('messages');
    var $message = document.createElement('div');
    $message.innerHTML = message;
    $container.appendChild($message);
    console.log('e', event, message);
  }
});