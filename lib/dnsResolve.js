/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var _ = require('lodash');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var Promise = require('bluebird');
var utils = require('./utilities.js');
var dns = require('native-dns'); // NOTE: need for get more information about DNS Records (like TTL)
var nativeDNSPacketConsts = require('native-dns-packet').consts;
var standardDNS = require('dns');
var DNS_CONST = {
  MX_PRIORITY: 10,
  SRV_PRIORITY: 10,
  SRV_WEIGHT: 5,
  SRV_PORT: 5060,
  TTL: 3600
};

exports.DNS_CONST = DNS_CONST;

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
  if (!serverAddres) {
    serverAddres = '8.8.8.8';
  }
  return new Promise(function(resolve, reject) {
    var question_ = dns.Question(questionOption);
    var start = Date.now();
    var req = dns.Request({
      question: question_,
      server: {
        address: serverAddres,
        port: 53,
        type: 'udp'
      },
      timeout: 1000,
    });

    req.on('message', function(err, answer) {
      // NOTE: clear answers from another types
      if (!!answer && !!answer.answer) {
        answer.answer = _.filter(answer.answer, function(itemAnswer) {
          return nativeDNSPacketConsts.nameToQtype(questionOption.type) === itemAnswer.type;
        });
      }
      resolve(answer);
    });

    req.on('timeout', function(err) {
      reject(err);
    });

    req.on('end', function(data) {
      var delta = (Date.now()) - start;
      logger.debug('dnsRessolve::getDNSData:Finished processing request: ' + delta.toString() + 'ms');
    });

    req.send();
  });
};

/**
 * @name formatToNSONEAnswerFromFullInfo
 * @description method for convertation data about DNS Record to format for add to NSONE
 *
 * @param {String} type_
 * @param {Object} dnsAnswer_
 * @return {Array}
 */
exports.formatToNSONEAnswerFromFullInfo = function formatToNSONEAnswerFromFullInfo(type_, dnsAnswer_) {
  var dnsAnswer = _.clone(dnsAnswer_);
  var type = _.clone(type_);
  switch (type) {
    case 'A':
      return new Array(dnsAnswer.address);
    case 'AFSDB':
      return new Array(dnsAnswer.subtype, dnsAnswer.host);
    case 'HINFO':
      return new Array(dnsAnswer.hardware, dnsAnswer.os);
    case 'MX':
      // NOTE: constructtion "new Array(dnsAnswer.priority || DNS_CONST.MX_PRIORITY, dnsAnswer.host)"
      // NOTE: not will be work if "dnsAnswer.priority" equal 0(zero)
      if (dnsAnswer.priority === undefined) {
        dnsAnswer.priority = DNS_CONST.MX_PRIORITY;
      }
      return new Array(dnsAnswer.priority, dnsAnswer.exchange);
    case 'NAPTR':
      return new Array(dnsAnswer.order, dnsAnswer.preference, dnsAnswer.flags, dnsAnswer.service, dnsAnswer.regexp, dnsAnswer.replacement);
    case 'RP':
      return new Array(dnsAnswer.email, dnsAnswer.txt_dname);
    case 'SRV':
      if (dnsAnswer.priority === undefined) {
        dnsAnswer.priority = DNS_CONST.SRV_PRIORITY;
      }
      if (dnsAnswer.weight === undefined) {
        dnsAnswer.weight = DNS_CONST.SRV_WEIGHT;
      }
      if (dnsAnswer.port === undefined) {
        dnsAnswer.port = DNS_CONST.SRV_PORT;
      }
      return new Array(dnsAnswer.priority, dnsAnswer.weight, dnsAnswer.port, dnsAnswer.host);
    case 'NS':
      return new Array(dnsAnswer.data);
    case 'PTR':
      return new Array(dnsAnswer.data);
    case 'CNAME':
      return new Array(dnsAnswer.data);
    case 'TXT':
      return new Array(dnsAnswer.data);
    case 'AAAA':
      return new Array(dnsAnswer.data);
    default:
      return new Array(dnsAnswer);
  }
};
