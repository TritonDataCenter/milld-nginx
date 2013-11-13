# milld-nginx

Given an nginx `log_format` line, feed in nginx log lines, and output
milld-formatted lines.

## USAGE

```javascript
var MilldNginx = require('milld-nginx');

// The same log_format input that you have in your nginx conf
var mn = new MilldNginx('$remote_addr - $remote_user [$time_local] ' +
                        '$request "$status" $body_bytes_sent ' +
                        '"$http_referer" "$http_user_agent" ' +
                        '"$http_x_forwarded_for"');

fs.createReadStream('/var/log/nginx/access.log').pipe(mn).pipe(process.stdout);
```
