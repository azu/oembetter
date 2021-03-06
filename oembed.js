var request = require('request');
var urls = require('url');
var xml2js = require('xml2js');
var async = require('async');
var cheerio = require('cheerio');

var forceXml = false;

module.exports = function(url, options, callback) {
  var oUrl;
  var result;
  return async.series({
    discover: function(callback) {
      return request(url, function(err, response, body) {
        if (err) {
          return callback(err);
        }
        var $ = cheerio.load(body);

        // <link rel="alternate" type="application/json+oembed" href="http://www.youtube.com/oembed?format=json&amp;url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dzsl_auoGuy4" title="An Engineer&#39;s Guide to Cats 2.0 - The Sequel">
        oUrl = $('link[type="application/json+oembed"]').attr('href');
        if (!oUrl) {
          oUrl = $('link[type="application/xml+oembed"]').attr('href');
        }
        if (!oUrl) {
          return callback(new Error('no oembed discovery information available'));
        }
        return callback(null);
      });
    },
    fetch: function(callback) {
      // Just for testing - a lot of modern services
      // default to JSON and we want to make sure we
      // still test XML too
      if (forceXml) {
        oUrl = oUrl.replace('json', 'xml');
      }
      if (options) {
        var parsed = urls.parse(oUrl);
        var keys = Object.keys(options);
        keys.forEach(function(key) {
          parsed.query[key] = options[key];
        });
        oUrl = urls.format(parsed);
      }
      return request(oUrl, function(err, response, body) {
        if (err) {
          return callback(err);
        }
        if (body[0] === '<') {
          return xml2js.parseString(body, { explicitArray: false }, function(err, _result) {
            if (err) {
              return callback(err);
            }
            if (!_result.oembed) {
              return callback(new Error('XML response lacks oembed element'));
            }
            _result = _result.oembed;
            _result._xml = true;
            result = _result;
            return callback(null);
          });
        } else {
          result = JSON.parse(body);
          return callback(null);
        }
      });
    }
  }, function(err) {
    if (err) {
      return callback(err);
    }
    return callback(null, result);
  });
};

// For testing
module.exports.setForceXml = function(flag) {
  forceXml = flag;
};

