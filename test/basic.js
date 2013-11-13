var MN = require('../mn.js');
var mn = new MN('$remote_addr - $remote_user [$time_local] ' +
                '$request "$status" $body_bytes_sent ' +
                '"$http_referer" "$http_user_agent" ' +
                '"$http_x_forwarded_for"');

var fs = require('fs');
var inp = fs.createReadStream(__dirname + '/access.log');
inp.pipe(mn).pipe(process.stdout);
