const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const keytoolPath = '"C:\\Program Files\\Java\\jre-1.8\\bin\\keytool.exe"';
const keystorePath = path.join(os.homedir(), '.android', 'debug.keystore');
const cmd = `${keytoolPath} -list -v -keystore "${keystorePath}" -alias androiddebugkey -storepass android -keypass android`;

console.log("Running keytool...");

exec(cmd, (err, stdout, stderr) => {
    if (err) {
        console.error("ERROR:", err);
        return;
    }

    // Remove all newlines and extra spaces to form a single continuous string
    // This fixes the wrapping issue completely.
    const clean = stdout.replace(/[\r\n\s]+/g, '');

    // Look for "SHA1:" followed by hex chars
    // We expect roughly 20 bytes (hex:pairs)

    const match = clean.match(/SHA1:([0-9A-F:]{59})/i);

    if (match) {
        console.log("SHA1 Found! Writing to final_sha1.txt");
        fs.writeFileSync('final_sha1.txt', match[1]);
    } else {
        console.log("NO MATCH FOUND in output.");
        // Write debug info
        fs.writeFileSync('final_sha1.txt', "DEBUG_OUTPUT:\n" + clean);
    }
});
