// inicializador junto com o windows
const AutoLaunch = require('auto-launch');
// verifica se está em desenvolvimento
const isDev = require('electron-is-dev');

module.exports = () => {
  // se estiver em produção
  if(!isDev) {
    // instancia o autoLauncher para inicializar com o sistema
    const autoLauncher = new AutoLaunch({name:'FTALK'});
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
};