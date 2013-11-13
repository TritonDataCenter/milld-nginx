var stream = require('stream');
var Transform = stream.Transform;
var assert = require('assert');
var util = require('util');

var debug = util.debuglog && util.debuglog('mn');
if (!debug)
  debug = function() {};

if (!Transform)
  throw new Error('Sorry, your node is too crusty, get a new one')


module.exports = MilldNginx;

util.inherits(MilldNginx, Transform);

function MilldNginx(logFormat, options) {
  this._logFormat = parseLogFormat(logFormat);
  this._pos = 0;
  this._buffer = '';

  Transform.call(this, options);
}

MilldNginx.prototype._transform = function(chunk, encoding, cb) {
  if (typeof chunk !== 'string')
    chunk = chunk.toString('utf8');
  else if (encoding !== 'utf8')
    chunk = new Buffer(chunk, encoding).toString('utf8');

  var lines = (this._buffer + chunk).split('\n');
  this._buffer = lines.pop();

  // parse all the lines!
  lines.forEach(this._parseLine, this)
  cb();
};

MilldNginx.prototype._parseLine = function(line, index, lines) {
  debug('parseLine %j %j', line, this._logFormat);
  var obj = {};
  var l = line;
  var timestamp = null;
  this._logFormat.forEach(function(word) {
    debug('>>%s<< %j', word, l);
    // chop off a chunk of the line, and update the object.
    if (!word.match(/^\$.+?\b/)) {
      // just some literal text.  walk over it.
      assert.equal(l.slice(0, word.length), word);
      l = l.slice(word.length);
      return;
    }

    var re = null;
    var dateParse = null;
    var number = false;
    var key = word.slice(1);
    switch (word) {
      case '$body_bytes_sent':
      case '$bytes_sent':
      case '$connection':
      case '$request_length':
      case '$status':
      case '$msec':
      case '$status':
        number = true;
        re = /\d+/;
        break;

      case '$pipe':
        re = /./;
        break

      case '$remote_user':
        re = /[^ ]+/;
        break;

      case '$remote_addr':
      case '$http_x_forwarded_for':
        re = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|-/;
        break;

      case '$time_local':
        re = clfRe;
        dateParse = parseClf;
        break;

      case '$time_iso8601':
        re = isoRe;
        dateParse = parseIso;
        break;

      case '$request':
        re = /[A-Z]+ [^ ]+ HTTP\/(1\.0|1\.1|0\.9)/;
        break;

      case '$http_referrer':
      case '$http_user_agent':
      default:
        re = /[^"]+/;
        break;
    }

    obj[key] = chomp(l, re);
    if (obj[key]) {
      l = l.slice(obj[key].length);

      if (dateParse)
        timestamp = dateParse(obj[key]).getTime();
      else if (number)
        obj[key] = +obj[key];
    }
  });

  var mline = '';
  assert(timestamp);
  mline = timestamp + ',' + JSON.stringify(obj) + '\n';

  this.push(mline, 'utf8');
};

function parseClf(c) {
  c = clfRe.exec(c);
  return new Date(c[1] + ' ' + c[2] + ' ' + c[3] + ' ' + c[4] + ' ' + c[6]);
}

function parseIso(c) {
  return new Date(c);
}

var clfRe = /([0-9]{1,2})\/([A-Za-z]{3})\/([0-9]{4}):([0-9]{2}:[0-9]{2}:[0-9]{2})( ([+-][0-9]{4}|Z))/
var isoRe = /([0-9]{4}-[0-9]{2}-[0-9]{2})(?:T([0-9]{2}:[0-9]{2})(:[0-9]{2}(\.[0-9]+)?)?)?(Z|[+-][0-9]{2}:[0-9]{2}|[+-][0-9]{4})?/

var wordRe = /([^\\]|^)\$(.+?)\b/g;
var wordRepl = '$1\0$$$2\0';
function parseLogFormat(logFormat) {
  return logFormat.replace(wordRe, wordRepl).split('\0');
}

function chomp(line, re) {
  var cut = re.exec(line);
  if (cut) cut = cut[0];
  return cut;
}
