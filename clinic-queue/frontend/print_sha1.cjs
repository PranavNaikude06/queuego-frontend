const fs = require('fs');
try {
    let sha1 = fs.readFileSync('final_sha1.txt', 'utf8');
    // Trim
    sha1 = sha1.trim();

    console.log("START_SHA1");
    // Print in chunks of 20 chars
    console.log("PART1:" + sha1.substring(0, 20));
    console.log("PART2:" + sha1.substring(20, 40));
    console.log("PART3:" + sha1.substring(40));
    console.log("END_SHA1");
} catch (e) {
    console.error(e);
}
