const path = require('path');
const { MSICreator } = require('electron-wix-msi');

async function work() {

  // Step 1: Instantiate the MSICreator
  const msiCreator = new MSICreator({
    appDirectory: path.resolve(__dirname, 'dist', 'windows'),
    description: 'Chat Finer',
    exe: 'ftalk',
    name: 'ftalk',
    manufacturer: 'Finer',
    version: '1.0.0',
    outputDirectory: path.resolve(__dirname, 'dist', 'installers')
  });
  
  // Step 2: Create a .wxs template file
  await msiCreator.create();
  
  // Step 3: Compile the template to a .msi file
  await msiCreator.compile();

}

work().then(() => {
  console.log('HERE')
}).catch(e => console.log('erro1', e));