const {app, BrowserWindow, ipcMain, Menu, Tray, shell, nativeTheme} = require('electron')
const path = require('path');
const RiotWSProtocol = require('./lcu-ws.js');
const LeagueClient = require('league-connect');
const isDev = require('electron-is-dev');
const logger = require('./logger');
const Store = require('electron-store');
const config = {name: 'app-config', fileExtension: 'json', cwd: path.dirname(__dirname)}
const store = new Store(config);
const express = require('express');
const proxy = require('express-http-proxy');
const net = require('net');
const authManager = require('./auth-manager');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
app.commandLine.appendSwitch('disable-features', 'WidgetLayering');

global.auth = {};
let mainWinId = null
let win = undefined
let tray = undefined
let isClosing = false;
global.timers = {
  authInterval: [],
  cancelInterval: []
};
global.setConfigTimer = null

const gotSingleInstanceLock = app.requestSingleInstanceLock();
logger.info(`version: ${app.getVersion()}`)
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (isClosing) {
      app.relaunch()
      app.exit();
    } else if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  });
  const server = express();
  // proxy
  server.use('/lol', (req, res, next) => {
    const targetPort = req.headers['x-target-port'] || '0';
    const proxyUrl = `https://127.0.0.1:${targetPort}`;

    return proxy(proxyUrl, {
      proxyReqOptDecorator: function (proxyReqOpts, srcReq) {
        proxyReqOpts.headers['Host'] = `127.0.0.1:${targetPort}`;
        return proxyReqOpts;
      },
      userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
        const exchange = `[${userReq.method}] [${proxyRes.statusCode}] ${userReq.path} -> ${proxyRes.connection.remoteAddress}`;
        logger.info(exchange)
        return proxyResData;
      },
      proxyReqPathResolver: function (req) {
        // 路徑重寫
        const resolvedPath = req.originalUrl.replace('/lol/', '/');
        logger.info(`解析後的路徑: ${resolvedPath}`)
        return resolvedPath;
      }
    })(req, res, next);
  });

  function findFreePort(start, range, maxAttempts, attemptLogs = []) {
    return new Promise((resolve, reject) => {
      if (attemptLogs.length >= maxAttempts) {
        logger.info(`嘗試以下端口均失敗: ${attemptLogs.join(', ')}`)
        reject(new Error('找不到可用的端口'));
        return;
      }

      let currentPort = start + Math.floor(Math.random() * range);
      const server = net.createServer();

      server.listen(currentPort, () => {
        server.once('close', () => {
          resolve(currentPort);
        });
        server.close();
      });

      server.on('error', () => {
        attemptLogs.push(currentPort);
        resolve(findFreePort(start, range, maxAttempts, attemptLogs));
      });
    });
  }

  app.whenReady().then(() => {
    findFreePort(10000, 5000, 10).then((freePort) => {
      server.use(express.static(path.join(__dirname, '../build')));
      server.listen(freePort, () => {
        logger.info(`Server running on http://localhost:${freePort}`)
      });

      initTray();
      initTheme()
      createWindow(freePort);
      initLolListener()

    }).catch((error) => {
      logger.error(error.message)
      app.quit(); // 找不到可用端口，關閉程式
    });
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function initTheme() {
  const config = store.get('config');
  if (config && typeof config.isDarkMode !== 'undefined') {
    nativeTheme.themeSource = config.isDarkMode ? 'dark' : 'light';
    return;
  }
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'dark'
  } else {
    nativeTheme.themeSource = 'light'
  }
}

/**
 * 發送配置，並在配置未收到回應時進行重試
 * @param {number} maxRetries - 最大重試次數
 * @param {number} retryInterval - 每次重試的間隔時間，單位為毫秒
 */
function sendConfigTimer(maxRetries, retryInterval) {
  let retries = 0;
  // 發送配置的函數
  const sendConfig = () => {
    retries++;
    logger.info(`sendConfigTimer retries:${retries}`)
    win.webContents.send('set-config', store.get('config'));
    // 如果超過最大重試次數，則停止重試
    if (retries >= maxRetries) {
      logger.info('Max retries reached, giving up on sending config.');
      clearTimeout(global.setConfigTimer);  // 清除定時器，確保不再重試
      return;
    }
    // 每隔一段時間重試發送配置
    global.setConfigTimer = setTimeout(sendConfig, retryInterval);
  };
  // 開始發送配置
  sendConfig();
}

//創建主視窗
function createWindow(freePort) {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
  })
  win.setIcon(path.join(__dirname, '../resources/icon.ico'))
  win.on('close', (event) => {
    event.preventDefault()
    win.hide();
  });
  const url = isDev
    ? 'http://localhost:8080'
    : `http://127.0.0.1:${freePort}`;

  win.loadURL(url)
  mainWinId = win.id
  if (!isDev) Menu.setApplicationMenu(null)
  win.webContents.once('dom-ready', () => {
    logger.info(`mainWindow finished loading auth:${global.auth} ${Object.keys(global.auth).length > 0}`);
    if (Object.keys(global.auth).length > 0) {
      // 每一秒發一送auth訊息
      let authInterval = setInterval(() => {
        logger.info('Resending auth message');
        win.webContents.send('auth', global.auth);
      }, 1000);

      // 1分鐘後自動取消auth定時器
      let cancelInterval = setTimeout(() => {
        logger.info('Automatically canceling auth message resend after 1 minute');
        global.timers.authInterval.forEach(s => clearInterval(s))
      }, 60 * 1000);
      global.timers.authInterval.push(authInterval)
      global.timers.cancelInterval.push(cancelInterval)
    }
    //send config
    sendConfigTimer(150, 200)
    
    // Check for updates
    checkAppUpdate(win);
  });
}

function isNewerVersion(oldVer, newVer) {
  const oldParts = oldVer.split('.').map(Number);
  const newParts = newVer.split('.').map(Number);
  for (let i = 0; i < Math.max(oldParts.length, newParts.length); i++) {
    const oldPart = oldParts[i] || 0;
    const newPart = newParts[i] || 0;
    if (newPart > oldPart) return true;
    if (oldPart > newPart) return false;
  }
  return false;
}

function checkAppUpdate(mainWindow) {
  const currentVersion = app.getVersion();
  const https = require('https');
  const updateUrl = 'https://raw.githubusercontent.com/3122380192/LMHTVLDAUTO/main/update.json';
  
  logger.info(`Checking for updates... Current version: ${currentVersion}`);
  
  const req = https.get(updateUrl, { timeout: 5000 }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        logger.error(`Update check failed: status ${res.statusCode}`);
        return;
      }
      try {
        const updateInfo = JSON.parse(data);
        if (updateInfo && updateInfo.version) {
          const isNewer = isNewerVersion(currentVersion, updateInfo.version);
          if (isNewer) {
            logger.info(`Update required: current ${currentVersion}, remote ${updateInfo.version}`);
            mainWindow.webContents.send('update-required', {
              version: updateInfo.version,
              url: updateInfo.url || 'https://github.com/3122380192/LMHTVLDAUTO/releases',
              message: updateInfo.message || 'Phát hiện phiên bản mới! Bạn cần cập nhật để tiếp tục sử dụng ứng dụng.'
            });
          } else {
            logger.info('App is up to date.');
          }
        }
      } catch (e) {
        logger.error('Failed to parse update JSON:', e);
      }
    });
  });
  
  req.on('error', (err) => {
    logger.error('Update check HTTP error:', err);
  });
}

async function initLolListener() {
  logger.info('[initLolListener] 開始檢測 LOL 是否執行...')
  const credentials = await LeagueClient.authenticate({
    awaitConnection: true,
    pollInterval: 2000,
  });
  logger.info('[initLolListener] credentials:', JSON.stringify(credentials, null, 2))

  const client = new LeagueClient.LeagueClient(credentials, {
    pollInterval: 2000,
  });

  client.on('connect', async (newCredentials) => {
    logger.info('[LeagueClient] connect 事件觸發 → LOL 執行中:', JSON.stringify(newCredentials, null, 2))

    let data =
      {
        protocol: 'https',
        address: '127.0.0.1',
        port: newCredentials.port,
        username: 'riot',
        password: newCredentials.password
      }
    global.auth = data
    BrowserWindow.fromId(mainWinId).webContents.send('lol-connect', '');
    BrowserWindow.fromId(mainWinId).webContents.send('auth', data);
    try {
      connectWithRetry(`wss://${data.username}:${data.password}@${data.address}:${data.port}/`, 10);
    } catch (error) {
      logger.error(`Caught error: ${error}`)
    }
  });

  client.on('disconnect', () => {
    logger.info('[LeagueClient] disconnect 事件觸發 → LOL 已關閉')
    BrowserWindow.fromId(mainWinId).webContents.send('lol-disconnect', '');
  });
  // 手動觸發一次,如果LOL執行中，league-connect套件不會觸發，要等到重開LOL才會觸發
  client.emit('connect', credentials);
  client.start();
  logger.info('[initLolListener] client.start() 已執行')
}

const connectWithRetry = (url, retriesLeft) => {
  logger.info(`Attempting to connect to ${url}. Retries left: ${retriesLeft}`)
  const ws = new RiotWSProtocol(url);
  ws.on('error', error => {
    logger.error(`Error: ${error}`)
    if (retriesLeft === 0) {
      logger.error('No more retries left. Exiting...')
      return;
    }
    setTimeout(() => {
      logger.error('Retrying: ', retriesLeft)
      connectWithRetry(url, retriesLeft - 1);
    }, 2000);
  });
  ws.on('open', () => {
    logger.info(`Connected to ${url}`)
    retriesLeft = 0;
    ws.subscribe('OnJsonApiEvent', handleOnLoginSession);
    ws.subscribe('OnJsonApiEvent_lol-gameflow_v1_gameflow-phase', handleOnGameflowPhase);
  });
  ws.on('close', () => {
    logger.info(`Connection to ${url} closed`)
    if (retriesLeft === 0) {
      BrowserWindow.fromId(mainWinId).webContents.send('lol-disconnect', '');
    }
  })
};

function handleOnLoginSession(payload) {
  // logger.info(payload);
  if (payload.eventType === 'Create' && payload.uri === '/lol-champ-select/v1/all-grid-champions') {
    BrowserWindow.fromId(mainWinId).webContents.send('auth', global.auth);
  }

  if (payload.uri.includes('/lol-champ-select/v1/summoners/') && payload.data.championId !== 0) {
    logger.info("champ-select/summoners", JSON.stringify(payload, null, 2))
    BrowserWindow.fromId(mainWinId).webContents.send('champ-select-summoners', payload.data);
  }

  if (payload.uri === '/lol-champ-select/v1/session' && payload.eventType !== 'Delete') {
    logger.info("champ-select/session ", JSON.stringify(payload, null, 2))
    BrowserWindow.fromId(mainWinId).webContents.send('champ-select-session', payload.data);
  }

  if (payload.uri === '/lol-lobby/v2/comms/members' && payload.eventType !== 'Delete') {
    logger.info("lol-lobby/v2/comms/members ", JSON.stringify(payload, null, 2))
    BrowserWindow.fromId(mainWinId).webContents.send('lobby-comms-members', payload.data);
  }

}

function handleOnGameflowPhase(payload) {
  logger.info(JSON.stringify(payload, null, 2))
  const phase = payload.data;
  handleGamePhase(phase)
}

ipcMain.on('switch-native-theme', (_, message) => {
  if (['dark', 'light'].includes(message)) {
    nativeTheme.themeSource = message
  }
})

ipcMain.on('get-auth', (ev, data) => {
  ev.reply('auth', global.auth)
  logger.info("get-auth and reply ", global.auth)
})

ipcMain.on('kill-lol', async (ev, data) => {
  try {
    const tasklist = await import('tasklist');
    const taskkill = await import('taskkill');
    let process = await tasklist.tasklist()
    let lolprocess = process
      .filter(p => p.imageName.includes("League") || p.imageName.includes("RiotClient"))
      .map(p => ({pid: p.pid, imageName: p.imageName}));
    logger.info(lolprocess, lolprocess.length)
    if (lolprocess.length === 0) {
      ev.reply('kill-lol-ack', lolprocess)
      return
    }
    await taskkill.taskkill(lolprocess.map(p => p.pid), {force: true});
    ev.reply('kill-lol-ack', lolprocess)
  } catch (error) {
    ev.reply('kill-lol-ack', [])
    logger.error('Error importing tasklist:', error)
  }
})

ipcMain.handle('check-auth', async () => {
  try {
    return await authManager.verifyAuthorization();
  } catch (error) {
    return { status: 'error', error: error.message, hwid: authManager.getHWID() };
  }
});

ipcMain.handle('get-config', () => {
  return store.get('config');
});

ipcMain.on('set-config', (event, config) => {
  logger.info('Received [set-config] from react', config)
  store.set('config', config);
});

ipcMain.on('auth-ack', (event, arg) => {
  logger.info('Received [auth-ack] from react', arg)
  handleGamePhase(arg)
  global.timers.authInterval.forEach(s => clearInterval(s))
  global.timers.cancelInterval.forEach(s => clearTimeout(s))
});

ipcMain.on('exit-app', () => {
  logger.info('Received [exit-app] from react, exiting...')
  app.exit();
});

ipcMain.on('open-link', (event, url) => {
  logger.info('Received [open-link] from react', url)
  shell.openExternal(url);
});

ipcMain.on('always-on-top', (event, url) => {
  logger.info('Received [always-on-to] from react', url)
  if (win.isAlwaysOnTop()) {
    win.setAlwaysOnTop(false)
  } else {
    win.setAlwaysOnTop(true)
  }
});

ipcMain.on('init-set-config-ack', (event, data) => {
  logger.info('Received [init-set-config-ack] from react', data)
  if (global.setConfigTimer) {
    clearTimeout(global.setConfigTimer);
    global.setConfigTimer = null;
    logger.info('setConfigTimer attempt stopped.')
  }
  // 停止監聽這個事件
  ipcMain.removeListener('set-config-response', arguments.callee);
  win.show();
});

ipcMain.on('riot-login', async (event, { username, password, riotClientPath }) => {
  const exePath = riotClientPath || 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe';
  const fs = require('fs');
  const { exec } = require('child_process');
  
  logger.info('Received [riot-login] command for username:', username);

  // 1. Kill any existing client processes first for a clean state
  try {
    const taskkill = await import('taskkill');
    const tasklist = await import('tasklist');
    const plist = await tasklist.tasklist();
    const lprocess = plist
      .filter(p => p.imageName.includes("League") || p.imageName.includes("RiotClient"))
      .map(p => p.pid);
    if (lprocess.length > 0) {
      await taskkill.taskkill(lprocess, { force: true });
    }
  } catch (err) {
    logger.error('Failed to kill processes before login:', err);
  }

  // 2. Wait 1.5 seconds after kill for resources to free up
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 3. Prepare the VBScript script content
  const escapedUser = username.replace(/"/g, '""');
  const escapedPass = password.replace(/"/g, '""');
  
  const vbsContent = `
Set wshShell = CreateObject("WScript.Shell")
wshShell.Run """${exePath}"" --launch-product=league_of_legends --launch-patchline=live"

' Wait for Riot Client window to exist and be active
Dim activated
activated = False
For i = 1 To 30
    WScript.Sleep 500
    If wshShell.AppActivate("Riot Client") Then
        activated = True
        Exit For
    End If
Next

If activated Then
    WScript.Sleep 1000
    ' Focus client again to be safe
    wshShell.AppActivate "Riot Client"
    WScript.Sleep 300
    
    ' Select all and type username
    wshShell.SendKeys "^a"
    WScript.Sleep 100
    wshShell.SendKeys "${escapedUser}"
    WScript.Sleep 200
    
    ' Tab to password field
    wshShell.SendKeys "{TAB}"
    WScript.Sleep 200
    
    ' Select all and type password
    wshShell.SendKeys "^a"
    WScript.Sleep 100
    wshShell.SendKeys "${escapedPass}"
    WScript.Sleep 200
    
    ' Press Enter to submit
    wshShell.SendKeys "{ENTER}"
End If
  `;

  // 4. Write script to a temporary file
  const tempVbsPath = path.join(app.getPath('temp'), 'temp_login.vbs');
  try {
    fs.writeFileSync(tempVbsPath, vbsContent, 'utf-8');
    
    // Execute the VBScript using wscript
    exec(`wscript.exe "${tempVbsPath}"`, (err) => {
      if (err) {
        logger.error('VBScript execution error:', err);
      }
      // Delete the temp file after execution starts or finishes
      setTimeout(() => {
        try {
          if (fs.existsSync(tempVbsPath)) {
            fs.unlinkSync(tempVbsPath);
          }
        } catch (e) {
          logger.error('Failed to delete temp VBScript:', e);
        }
      }, 10000);
    });
  } catch (err) {
    logger.error('Failed to write or run VBScript:', err);
  }
});

function handleGamePhase(phase) {
  const mainWindow = BrowserWindow.fromId(mainWinId).webContents;
  switch (phase) {
    case "None":
      logger.info("遊戲大廳");
      mainWindow.send("None", phase);
      break;
    case "Lobby":
      logger.info("已開房組隊");
      mainWindow.send("Lobby", phase);
      break;
    case "Matchmaking":
      logger.info("正在列隊中");
      mainWindow.send("Matchmaking", phase);
      break;
    case "ReadyCheck":
      logger.info("已排到對戰，等待接受");
      mainWindow.send("ReadyCheck", phase);
      break;
    case "ChampSelect":
      logger.info("選擇英雄中");
      mainWindow.send("ChampSelect", phase);
      break;
    case "GameStart":
      logger.info("遊戲開始");
      mainWindow.send("GameStart", phase);
      break;
    case "InProgress":
      logger.info("遊戲中");
      mainWindow.send("InProgress", phase);
      break;
    case "PreEndOfGame":
      logger.info("遊戲即將結束");
      mainWindow.send("PreEndOfGame", phase);
      break;
    case "EndOfGame":
      logger.info("遊戲結束");
      mainWindow.send("EndOfGame", phase);
      break;
    default:
      logger.info("未知遊戲階段", phase);
  }
}

function initTray() {
  tray = new Tray(path.join(__dirname, '../resources/icon.ico'))
  tray.on('click', function (event) {
    win.show()
    win.focus()

    // Show devtools when command clicked
    if (win.isVisible() && process.defaultApp && event.metaKey) {
      win.openDevTools({mode: 'detach'})
    }
  })
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open', type: 'normal', click: async () => {
        win.show()
        win.focus()
      }
    },
    {
      label: 'Exit', type: 'normal', click: async () => {
        win.webContents.send('get-config');
        tray.destroy()
        win.hide()
        isClosing = true
        // 等待react完成銷毀，儲存config，最久不超過8秒
        setTimeout(() => {
          app.exit();
        }, 8000);
      }
    }
  ])
  tray.setContextMenu(contextMenu)
}