#!/usr/bin/env node
const fs = require("fs");
const { globalAgent } = require("http");
const { domain } = require("process");
const util = require('util');
// const exec = util.promisify(require('child_process').exec);
var exec = require('child_process').exec;
var CONSTANTS = require('./const');
const { registerCLI } = require("./httpClient");
var initService = require('./initService');
var globalConfig = {}
var utilService = require('./utilService');
var sshService = require('./sshService')

const SSH_KEY_GEN_COMMAND = "ssh-keygen -t rsa -b 4096 -N '1234534d' -f ./stormy/.ssh/id_rsa -C rabans"

function isSSHInitDone(){
  return fs.existsSync(CONSTANTS.SSH_PRIVATE_KEY_FILE);
}

async function initSSH(user) { 
  if (isSSHInitDone()){
    return 
  }
}

async function writeToFile(content, filePath){
  return fs.promises.writeFile(filePath, content)
}

// initService.init();

function getExcludedFolderString(excludedFolders){
  // var excludedFolders = CONSTANTS.EXCLUDED_FOLDERS;
  if (!excludedFolders.length) 
    return ''
  cmd_line = ""
  // = '--exclude {'
  for (const folder of excludedFolders){
    cmd_line = cmd_line + " --exclude " +  folder + CONSTANTS.RSYNC.SPACE
  }
  // cmd_line = cmd_line + "''}"
  return cmd_line
}

function getSSHCommandString(){
  return '-e \"' + getExecutablePath('ssh') + ' -i ' + getUserKey() + '\"'
}

function getSourceFolder(){
  return './'
}

function getCurrentFoder(){
  let splitter = '\\';
  if(process.platform != 'win32'){
    splitter = '/'
  }
  var dir =  process.cwd().split(splitter);
  return  dir[dir.length - 1];
}

function pathToRemoteFolder(folderName){
  return CONSTANTS.RSYNC.DEST_FOLDER_USERNAME + '@' + CONSTANTS.RSYNC.IP  + ":~/" + folderName 
}

function generateRsyncCommandString(sourceDir, destDir){
  return getExecutablePath (CONSTANTS.RSYNC.NAME) + 
   CONSTANTS.RSYNC.SPACE  +
  CONSTANTS.RSYNC.ARGS + CONSTANTS.RSYNC.SPACE  +
  getExcludedFolderString(CONSTANTS.RSYNC.EXCLUDED_FOLDERS) + CONSTANTS.RSYNC.SPACE  +
  getSSHCommandString() + CONSTANTS.RSYNC.SPACE +
  sourceDir + CONSTANTS.RSYNC.SPACE  +
  destDir + CONSTANTS.RSYNC.SPACE
}


function getCommandUtil(remoteCommand){
  // return 
  // " \" mkdir "+ getCurrentFoder()+";+ 
  return "cd ~/" + getCurrentFoder() + " ; " + remoteCommand.join(' ') + "\"" 
}

function getRemoteCommandString(remoteCommand){
  return getExecutablePath('ssh') +' -i ' + getUserKey()+ ' ' + 
  CONSTANTS.RSYNC.DEST_FOLDER_USERNAME + 
  '@' + CONSTANTS.RSYNC.IP + ' ' + getCommandUtil(remoteCommand)
}

function getExecutablePath(name){
  if(process.platform != 'win32'){
    // set the permission to the key as chmod 400 
    excuteCommand('chmod 400 '+ getUserKey())
    return name;
  }
  switch(name){
    case 'ssh':
      return __dirname + '/DeltaCopy/ssh'
    case 'rsync':
      return __dirname + '/DeltaCopy/rsync'
  }
}

function getUserKey(uid){
  const key =  __dirname + CONSTANTS.RSYNC.PATH_TO_KEY
  // console.log("Trying to fetch the user key", key)
  return key
}

async function excuteCommand(command){
  // console.log(command)
  var executor = exec(command);

  executor.stdout.on('data', function(data){
    var p = data.replace('localhost', CONSTANTS.RSYNC.IP)
    process.stdout.write(p)
  })
  
  executor.stderr.pipe(process.stderr);
  executor.stdin.pipe(process.stdin);
}

async function init(){
  globalConfig = await initService.init()
  if ( globalConfig && !globalConfig['keyCreated']){
    await sshService.sshKeyGen()
    globalConfig['keyCreated'] = true
    
  }
  return globalConfig
}

async function parseArgs(){
  globalConfig = await init()
  var args = process.argv.slice(2);
  console.log(args[0])
  switch(args[0]){
    case 'login':
      console.log("Inside the login Method")
      var open = require('open')
      // var uud =  await initService.getUUID()
      // In the future redirect the user to the github
      // open('http://api.stormyapp.com/login/cli/' + uud)

      // Make an API call today to fetch the details from the body
      break;
    case 'init':
      // make a rquest to server
      console.log('Inside the init')
      var uuid =  await initService.getUUID()
      if ( globalConfig && !globalConfig['userCreated']){
        try {
          var result = await registerCLI(uuid, sshService.readPublicKey());
          console.log('The result is', result)
          globalConfig['guuid'] = result.data['guuid']
          globalConfig['userCreated'] = true
        }
        catch(e){
          console.log('There is an error in creating the user', e)
        }
      }
      initService.writeConfigJson(CONSTANTS.CONFIG_FILE, JSON.stringify(globalConfig))
      console.log('Inside the init method')
      break;
    default:
      console.log('Inside the default method')
      doMain()
  }
}

parseArgs();

function doMain() {
  var str = generateRsyncCommandString('./', pathToRemoteFolder(getCurrentFoder()))
  // console.log("The Rsync string is",str)
  var rsyncPromise = utilService.executeCommandPromise(str);
    rsyncPromise.then(() => {
    console.log('Waiting for rsync to finish')
    args = process.argv.slice(2)
    console.log(args);
    if (args.length) {
      const remoteCommand = getRemoteCommandString(args);
      console.log("The remote command is ", remoteCommand)
      excuteCommand(remoteCommand)
      // var syncBuildToLocal = generateRsyncCommandString(pathToRemoteFolder(getCurrentFoder()+'/build'), getSourceFolder());
      // console.log(syncBuildToLocal)
      // excuteCommand(syncBuildToLocal)
    }

  }).catch( (error) => {
    console.log('There is an error in executing the rsync command', error)
  })
}

