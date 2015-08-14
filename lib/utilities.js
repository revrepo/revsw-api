'use strict';
var marked = require('marked'),
  hapi = require('hapi'),
  crypto = require('crypto'),
  fs = require('fs'),
  Config = require('../config/config'),
  portal_request = require('supertest');


module.exports = {

  // read a file and converts the markdown to HTML
  getMarkDownHTML: function(path, callback) {
    fs.readFile(path, 'utf8', function(err, data) {
      if (!err) {
        marked.setOptions({
          gfm: true,
          tables: true,
          breaks: false,
          pedantic: false,
          sanitize: true,
          smartLists: true,
          smartypants: false,
          langPrefix: 'language-',
          highlight: function(code, lang) {
            return code;
          }
        });
        data = marked(data);
      }
      callback(err, data);
    });
  },


  generateID: function() {
    return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).substr(-4);
  },


  buildError: function(code, err) {
    var error = hapi.error.badRequest(err);
    error.output.statusCode = code;
    error.reformat();
    return error;
  },

  clone: function(obj) {
    return (JSON.parse(JSON.stringify(obj)));
  },


  isString: function(obj) {
    return typeof(obj) === 'string';
  },


  trim: function(str) {
    return str.replace(/^\s+|\s+$/g, '');
  },


  isArray: function(obj) {
    return obj && !(obj.propertyIsEnumerable('length')) && typeof obj === 'object' && typeof obj.length === 'number';
  },

  areOverlappingArrays: function (array1, array2) {
    for ( var i=0; i < array1.length; i++ ) {
      if ( array2.indexOf(array1[i]) !== -1 ) {
        return true;
      }
    }
    return false;
  },

  isArray1IncludedInArray2: function (array1, array2) {
    for ( var i=0; i < array1.length; i++) {
      if ( array2.indexOf(array1[i]) === -1 ) {
        return false;
      }
    }
    return true;
  },

  getHash: function (password) {
    return crypto.createHash('md5').update(password).digest('hex');
  },

  // Login to the portal and return error status and token
  loginToPortal: function (email, password, role, callback) {
    var userUserJson = {
      email: email,
      password_hashed: password,
      password: password,
      logFrm: 'user',
      user_type: role
    };

//    console.log('userUserJson = ', userUserJson);
    portal_request(Config.portal_url)
      .post('/user/login')
      .send(userUserJson)
      .end(function(err, res) {
        if (err || !res || res.statusCode !== 200) {
          callback(err, null);
        }
//        console.log(res.text);
        var response_json = JSON.parse(res.text);
        var userToken = response_json.response.token;
        callback( null, userToken );
    });
  }

};
