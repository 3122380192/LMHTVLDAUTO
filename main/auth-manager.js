const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const https = require('https');

const GMT_LIMIT = "2026/07/31 17:00:00";
const LIMIT_DATE = "2026/08/01 00:00:00";

// Assembling GitHub Token
function getGHToken() {
  return "gho_" + "p5aJY" + "7hdUk" + "eamg" + "4IDNc" + "HBnl" + "71MGZ" + "x21mM" + "mrJ";
}

// Get volume serial number from C drive and parse to decimal
function getHWID() {
  try {
    const output = execSync('cmd /c "vol C:"', { encoding: 'utf8' });
    const match = output.match(/Volume Serial Number is\s+([A-Fa-f0-9]{4})-([A-Fa-f0-9]{4})/);
    if (match) {
      const hex = match[1] + match[2];
      return parseInt(hex, 16).toString();
    }
  } catch (error) {
    console.error("Error getting HWID:", error);
  }
  // Fallback
  return "3796731232";
}

// Get Google GMT Time
function getGoogleGMTTime() {
  return new Promise((resolve) => {
    const req = https.get('https://www.google.com', { timeout: 4000 }, (res) => {
      const dateHeader = res.headers['date'];
      if (dateHeader) {
        const parts = dateHeader.split(' ');
        if (parts.length >= 6) {
          const month = parts[2];
          const months = {
            Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
            Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
          };
          const monthNum = months[month] || "01";
          const day = parts[1].padStart(2, '0');
          const year = parts[3];
          const time = parts[4];
          resolve(`${year}/${monthNum}/${day} ${time}`);
          return;
        }
      }
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}

// Expiration Check
async function isExpired() {
  const gmtTime = await getGoogleGMTTime();
  if (gmtTime) {
    if (gmtTime >= GMT_LIMIT) return true;
    return false;
  }
  // Fallback to local system time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const systemDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  if (systemDate >= LIMIT_DATE) return true;
  return false;
}

// Query devices list from GitHub
function queryDevicesList() {
  return new Promise((resolve, reject) => {
    const token = getGHToken();
    const random = Math.floor(Math.random() * 900000) + 100000;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/3122380192/AUTOTXv1.0/contents/devices.json?t=${random}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Electron-Device-Manager',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      timeout: 4000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned status ${res.statusCode}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          const contentBase64 = json.content.replace(/\s/g, '');
          const decoded = Buffer.from(contentBase64, 'base64').toString('utf8');
          const devicesData = JSON.parse(decoded);
          resolve({ devices: devicesData.devices, sha: json.sha, originalJson: decoded });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

// Register device on GitHub
function registerDeviceOnGitHub(hwid, computerName, userName, toolName, sha, originalJson) {
  return new Promise((resolve, reject) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const currentTime = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

      const devicesObj = JSON.parse(originalJson);
      
      const exists = devicesObj.devices.some(d => d.hwid === hwid && d.tool_name.toLowerCase() === toolName.toLowerCase());
      if (exists) {
        resolve();
        return;
      }

      const newDevice = {
        hwid: hwid,
        computer_name: computerName,
        user_name: userName,
        tool_name: toolName,
        status: "pending",
        last_seen: currentTime
      };

      devicesObj.devices.unshift(newDevice);
      const updatedJson = JSON.stringify(devicesObj, null, 2);
      const base64Content = Buffer.from(updatedJson, 'utf8').toString('base64');

      const token = getGHToken();
      const payload = JSON.stringify({
        message: `Register pending device: ${computerName} (${toolName})`,
        content: base64Content,
        sha: sha
      });

      const options = {
        hostname: 'api.github.com',
        path: '/repos/3122380192/AUTOTXv1.0/contents/devices.json',
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Electron-Device-Manager',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => responseBody += chunk);
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve();
          } else {
            reject(new Error(`Failed to register device: ${res.statusCode} ${responseBody}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Remove Vietnamese tones
function removeSign(str) {
  if (!str) return '';
  const accMap = {
    'a': 'áàảãạâấầẩẫậăắằẳẵặ',
    'A': 'ÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶ',
    'e': 'éèẻẽẹêếềểễệ',
    'E': 'ÉÈẺẼẸÊẾỀỂỄỆ',
    'i': 'íìỉĩị',
    'I': 'ÍÌỈĨỊ',
    'o': 'óòỏõọôốồổỗộơớờởỡợ',
    'O': 'ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ',
    'u': 'úùủũụưứừửữự',
    'U': 'ÚÙỦŨỤƯỨỪỬỮỰ',
    'y': 'ýỳỷỹỵ',
    'Y': 'ÝỲỶỸỴ',
    'd': 'đ',
    'D': 'Đ'
  };
  let result = str;
  for (const [letter, accLetters] of Object.entries(accMap)) {
    for (const char of accLetters) {
      result = result.replaceAll(char, letter);
    }
  }
  return result.replace(/[^\x20-\x7E]/g, '').trim();
}

async function verifyAuthorization() {
  try {
    const expired = await isExpired();
    if (expired) {
      return { status: 'expired', hwid: getHWID() };
    }

    const hwid = getHWID();
    const computerName = removeSign(os.hostname());
    const userName = removeSign(os.userInfo().username || 'User');
    const toolName = removeSign(path.basename(process.execPath));

    const { devices, sha, originalJson } = await queryDevicesList();
    const matchedDevice = devices.find(d => d.hwid === hwid && d.tool_name.toLowerCase() === toolName.toLowerCase());

    if (matchedDevice) {
      return { status: matchedDevice.status, hwid };
    }

    await registerDeviceOnGitHub(hwid, computerName, userName, toolName, sha, originalJson);
    return { status: 'pending', hwid };

  } catch (error) {
    console.error("Verification failed:", error);
    return { status: 'error', error: error.message, hwid: getHWID() };
  }
}

module.exports = {
  verifyAuthorization,
  getHWID
};
