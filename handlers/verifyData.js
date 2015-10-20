/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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

/*jslint node: true */

'use strict';

var mongoose = require('mongoose');
var async    = require('async');
var boom     = require('boom');
var _        = require('lodash');

var mongoConnection = require('../lib/mongoConnections');
var renderJSON      = require('../lib/renderJSON');

var Account = require('../models/Account');
var Domain  = require('../models/Domain');
var User    = require('../models/User');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var domains  = new Domain(mongoose, mongoConnection.getConnectionPortal());
var users    = new User(mongoose, mongoConnection.getConnectionPortal());

function verifyCompanyIdsInUser (request) {

  async.parallel([
    function (cb) {
      accounts.list(request, function (err, accounts) {
        if (err) {
          cb(err);
        }
        cb(null, accounts)
      });
    },
    function (cb) {
      domains.list(request, function (err, domains) {
        if (err) {
          cb(err);
        }
        cb(null, domains)
      });
    },
    function (cb) {
      users.list(request, function (err, users) {
        if (err) {
          cb(err);
        }
        cb(null, users)
      });
    }
  ], function (err, res) {
    if(err) {
      return boom.badImplementation('Error in find data', err);
    }
    var accounts    = res[0];
    var domains     = res[1];
    var users       = res[2];
    var user_ids    = [];
    var domain_ids  = [];
    var company_ids_for_users = [];
    var company_ids_for_domains = [];
    var broken_domain_name = [];

    // check broken referenced company id in users
    _.forEach(users, function (user) {
      _.forEach(user.companyId, function (company_id) {
        if (!_.findWhere(accounts, {'id': company_id})) {
          user_ids.push(user.id);
          company_ids_for_users.push(company_id);
        }
      });
    });

    // check broken referenced domen name in users
    _.forEach(users, function (user) {
      _.forEach(user.domain, function (domain) {
        if (!_.findWhere(domains, {'name': domain})) {
          user_ids.push(user.id);
          broken_domain_name.push(domain);
        }
      });
    });

    // check broken referenced company id in domains
    _.forEach(domains, function (user) {
      _.forEach(domains.companyId, function (company_id) {
        if (!_.findWhere(accounts, {'id': company_id})) {
          domain_ids.push(user.id);
          company_ids_for_domains.push(company_id);
        }
      });
    });
  });

}


/*
*
*
{
 "companyId": [
 "5588869fbde7a0d00338ce8f"
 ],
 "domain": [
 "portal-qa-domain.revsw.net",
 "qa-cds-purge-test.revsw.net",
 "qa-domain-group.revsw.net",
 "test-proxy-acl-deny-except.revsw.net",
 "test-proxy-cache-config-02.revsw.net",
 "test-proxy-cache-config.revsw.net",
 "test-proxy-dsa-config.revsw.net",
 "test-proxy-esi-config.revsw.net",
 "test-proxy-headers.revsw.net",
 "test-proxy-rma-config.revsw.net",
 "test-proxy-wildcard-domain.revsw.net",
 "testsjc20-bp01.revsw.net",
 "webdomain02.example.com",
 "www.example.com",
 "www.google-test.com"
 ],
 "email": "fedotov.evgenii@gmail.com",
 "firstname": "Eugeny",
 "lastname": "Fedotov",
 "updated_at": "2015-09-22T21:11:19.323Z",
 "created_at": "2015-09-21T22:32:07.054Z",
 "theme": "light",
 "role": "admin",
 "access_control_list": {
 "readOnly": false,
 "test": true,
 "configure": true,
 "reports": true,
 "dashBoard": true
 },
 "user_id": "56008567bc27973f022c9ff6"
 }

 *
* */

exports.verify = function (request, reply) {
  verifyCompanyIdsInUser(request);


  renderJSON(request, reply, null, {});
};
