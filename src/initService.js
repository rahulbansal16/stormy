const { resolveCname } = require('dns');
const { write } = require('fs');
const { globalAgent } = require('http');
const { config } = require('process');
fs = require('fs')
CONSTANTS = require('./const')

var globalConfig = {}

function createDir(targetDir) {
    try {
      let result = fs.existsSync(targetDir);
      if (!result){
        return fs.promises.mkdir(targetDir, { recursive: true });
      }
    } catch(e){
      console.log("Error creating the folder/file", e)
    }
}

function addKey(key, value) {
    globalConfig[key] = value;
    return writeConfigJson(CONSTANTS.CONFIG_FILE, JSON.stringify(globalConfig))
}

function writeConfigJson(configLocation, configJson){
    // console.log('\n\nThe configLocation is', configLocation)
    // console.log('\n\n')
    return new Promise((resolve, reject) =>{
        fs.writeFile(configLocation, configJson, function(err){
            if (err){
                reject(err)
            }
            else {
                resolve()
            }
        })
    });
}


function makeid(length) {
    var result           = '';
    var characters       = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return 'a'+result;
 }
 


async function getUUID() {
    
    if (globalConfig && globalConfig['uuid']){
        // console.log('Fetching the global value of the uuid', globalConfig['uuid'])
        return globalConfig['uuid']
    }

    var uud = makeid(30);
    // 'd'+uuidv4().split('-').join('')
    globalConfig['uuid'] = uud
    writeConfigJson(CONSTANTS.CONFIG_FILE, JSON.stringify(globalConfig))
    return uud;
}

const getGlobalConfig = () => {
    if ( Object.keys(globalConfig).length !== 0){
        return globalConfig
    }
    // Read the value from the user
}

function readConfigJson(configLocation){
    let result = fs.existsSync(configLocation);
    if (!result)
        return {}
    return new Promise((resolve, reject) => {
        fs.readFile(configLocation, 'utf8', (err, data) => {
            if(err){
                reject({});
            }
            else {
                resolve(JSON.parse(data));
            }
        })
    })
}

async function init(){
    try {
        var initFile = CONSTANTS.CONFIG_FILE;
        createDir(CONSTANTS.BASE_FOLDER);
        globalConfig = await readConfigJson(initFile);
        return globalConfig;
    } catch(e){
      console.log("Error initiating the build", e)
      globalConfig = {}
      return globalConfig
    }
}

module.exports = {
    readConfigJson,
    createDir,
    init,
    writeConfigJson,
    getUUID,
    globalConfig,
    addKey
}
