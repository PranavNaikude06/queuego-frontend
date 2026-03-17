const { exec } = require('child_process');
const path = require('path');
const os = require('os');

const keytoolPath = '"C:\\Program Files\\Java\\jre-1.8\\bin\\keytool.exe"';
const keystorePath = path.join(os.homedir(), '.android', 'debug.keystore');
const cmd = `${keytoolPath} -list -v -keystore "${keystorePath}" -alias androiddebugkey -storepass android -keypass android`;

exec(cmd, (err, stdout, stderr) => {
    if (err) {
        console.error("ERROR:", err);
        return;
    }
    const match = stdout.match(/SHA1:\s*([0-9A-F:]+)/);
    if (match) {
        console.log("CLEAN_SHA1:" + match[1]);
    } else {
        console.log("NO_MATCH");
        console.log(stdout.substring(0, 500)); // Print first 500 chars to debug
    }
});
