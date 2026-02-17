const fs = require('fs');
try {
    let sha1 = fs.readFileSync('final_sha1.txt', 'utf8');
    sha1 = sha1.trim();

    fs.writeFileSync('sha1_p1.txt', sha1.substring(0, 20));
    fs.writeFileSync('sha1_p2.txt', sha1.substring(20, 40));
    fs.writeFileSync('sha1_p3.txt', sha1.substring(40));
    console.log("DONE");
} catch (e) {
    console.error(e);
}
