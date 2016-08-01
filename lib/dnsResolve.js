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
var utils = require('./utilities.js');
// var dns = require('native-dns'); // TODO: use for get more information about DNS Records (TTL)
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
      resolveInfo.message = 'Sucessfully resolved CNAME record for domain ' + name;
      resolveInfo.data = answer;
      resolveInfo.error = err;
      cb(null, resolveInfo);
    } else {
      resolveInfo.message = 'Could not get CNAME record for domain ' + name;
      resolveInfo.data = answer;
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
          cb(null, resolveInfo);
        } else {
          resolveInfo.message = 'Domain ' + name + ' is NOT pointing to expected CNAME record ' + cname;
          resolveInfo.data = [];
          cb(null, resolveInfo);
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
