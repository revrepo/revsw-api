/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 */
'use strict';
var async = require('async');
var Promise = require('bluebird');
var utils = require('./utilities.js');
var dns = require('native-dns'); // NOTE: need for get more information about DNS Records (like TTL)
var standardDNS = require('dns');

exports.resolveA = function(hostname, cb) {
  var resolveInfo = {
    type: 'dns_resolve',
    query_type: 'A',
    hostname: hostname
  };

  standardDNS.resolve4(hostname, function(err, answer) {
    if (err) {
      resolveInfo.message = 'Could not get an IP address for domain ' + hostname;
      resolveInfo.data = [];
      resolveInfo.err = err;
      return cb(resolveInfo);
    } else {
      if (utils.isArray(answer) && answer.length !== 0) {
        resolveInfo.message = 'Succesfully resolved IP address for domain ' + hostname;
        resolveInfo.data = answer;
      } else {
        resolveInfo.message = 'Could not get IP address for domain ' + hostname;
        resolveInfo.data = [];
      }
    }
    cb(null, resolveInfo);
  });
};

exports.resolveCname = function(name, cb) {
  var resolveInfo = {
    type: 'dns_resolve',
    query_type: 'CNAME',
    hostname: name,
  };

  standardDNS.resolveCname(name, function(err, answer) {
    if (err) {
      return cb(err);
    } else {
      if (utils.isArray(answer) && answer.length !== 0) {
        resolveInfo.data = answer;
      } else {

      }
    }
    cb(null, resolveInfo);
  });
};

//
exports.resolve = function(name, type_, cb) {
  var resolveInfo = {
    type: 'dns_resolve',
    query_type: type_
  };
  standardDNS.resolve(name, type_, function(err, answer) {
    if (!err || !utils.isArray(answer) || answer.length !== 0) {
      resolveInfo.message = 'Sucessfully resolved "' + type_ + '" record for "' + name + '"';
      resolveInfo.data = answer;
      resolveInfo.short_answers = answer;
      cb(null, resolveInfo);
    } else {
      resolveInfo.message = 'Could not get "' + type_ + '" record for "' + name + '"';
      resolveInfo.data = answer;
      resolveInfo.short_answers = answer;
      resolveInfo.error = err;
      cb(resolveInfo);
    }
  });
};

exports.checkDomainCNAMEsIncludeCname = function(name, cname, cb) {
  var resolveInfo = {
    type: 'dns_resolve',
    query_type: 'CNAME'
  };

  this.resolve(name, 'CNAME', function(err, answer) {
    if (!err) {
      if (utils.isArray(answer.data) && answer.data.length !== 0) {
        if (answer.data.indexOf(cname) !== -1) {
          resolveInfo.message = 'Domain ' + name + ' is pointing to expected CNAME record ' + cname;
          resolveInfo.data = answer.data;
          resolveInfo.short_answers = answer;

          cb(null, resolveInfo);
        } else {
          resolveInfo.message = 'Domain ' + name + ' is NOT pointing to expected CNAME record ' + cname;
          resolveInfo.data = [];
          resolveInfo.short_answers = answer;
          cb(resolveInfo);
        }
      } else {
        resolveInfo.message = 'Could not resolve domain ' + name;
        cb(resolveInfo);
      }
    } else {
      resolveInfo.message = 'Could not resolve domain ' + name;
      resolveInfo.data = err;
      cb(resolveInfo);
    }

  });
};

exports.getDNSData = function(questionOption, serverAddres) {
  return new Promise(function(resolve, reject) {
    var question_ = dns.Question(questionOption);
    var req = dns.Request({
      question: question_,
      server: { address: serverAddres, port: 53, type: 'udp' },
      timeout: 1000,
    });
    req.on('message', function(err, answer) {
      resolve(answer);
    });
    req.on('timeout', function(err) {
      reject(err);
    });
    req.send();
  });
};
