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

var Account  = require('../models/Account');
var Domain   = require('../models/Domain');
var Location = require('../models/Location');
var PurgeJob = require('../models/PurgeJob');
var User     = require('../models/User');
var ServerGroup = require('../models/ServerGroup');
var MasterConfiguration = require('../models/MasterConfiguration');

var accounts     = new Account(mongoose, mongoConnection.getConnectionPortal());
var domains      = new Domain(mongoose, mongoConnection.getConnectionPortal());
var locations    = new Location(mongoose, mongoConnection.getConnectionPortal());
var users        = new User(mongoose, mongoConnection.getConnectionPortal());
var purgeJobs    = new PurgeJob(mongoose, mongoConnection.getConnectionPurge());
var masterConf   = new MasterConfiguration(mongoose, mongoConnection.getConnectionPortal());
var serverGroups = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());

/**
 *
 * @param request
 * @param reply
 */
exports.referenced = function (request, reply) {
  if (request.auth.credentials.email !== 'fedotov.evgenii@gmail.com' && request.auth.credentials.email !== 'victor@revsw.com') {
    return reply(boom.forbidden('Access denied'));
  }
  async.parallel({
    accounts : function (cb) {
      accounts.listAll(request, function (err, accounts) {
        if (err) {
          cb(err);
        }
        cb(null, accounts)
      });
    },
    domains : function (cb) {
      domains.listAll(request, function (err, domains) {
        if (err) {
          cb(err);
        }
        cb(null, domains)
      });
    },
    users : function (cb) {
      users.listAll(request, function (err, users) {
        if (err) {
          cb(err);
        }
        cb(null, users)
      });
    }
  }, function (err, res) {
    if(err) {
      return reply(boom.badImplementation('Error in find data', err));
    }

    var broken_company_ids  = [];
    var broken_domain_names = [];
    var user_result = [];
    var domain_result = [];
    var result = {};

    // check broken referenced company id in users
    _.forEach(res.users, function (user) {

      _.forEach(user.companyId, function (company_id) {
        if (!_.findWhere(res.accounts, {'id': company_id})) {
          broken_company_ids.push(company_id);
        }
      });

      _.forEach(user.domain, function (domain) {
        if (!_.findWhere(res.domains, {'name': domain})) {
          broken_domain_names.push(domain);
        }
      });

      if (!_.isEmpty(broken_company_ids) || !_.isEmpty(broken_domain_names)) {
        var broken_user_data = {
          user_id: user.user_id
        };
      }

      if (!_.isEmpty(broken_company_ids)) {
        broken_user_data.broken_company_ids = broken_company_ids;
      }

      if (!_.isEmpty(broken_domain_names)) {
        broken_user_data.broken_domain_names = broken_domain_names;
      }

      if (!_.isEmpty(broken_user_data)) {
        user_result.push(broken_user_data);
      }

      /*if (!_.isEmpty(broken_company_ids)) {
        _.remove(user.companyId, function (companyId) {
          return _.indexOf(broken_company_ids, companyId) !== -1
        });
      }*/
    });

    broken_company_ids = [];

    // check broken referenced company id in domains
    _.forEach(res.domains, function (domain) {

      _.forEach(domain.companyId, function (company_id) {
        if (!_.findWhere(res.accounts, {'id' : company_id})) {
          broken_company_ids.push(company_id);
        }
      });

      if (!_.isEmpty(broken_company_ids) || !_.isEmpty(broken_domain_names)) {
        var broken_domain_data = {
          domain_name : domain.name
        };
      }

      if (!_.isEmpty(broken_company_ids)) {
        broken_domain_data.broken_company_ids = broken_company_ids;
      }

    });

    if (!_.isEmpty(user_result)) {
      result = {
        user_data: user_result
      };
    }

    if (!_.isEmpty(domain_result)) {
      result = {
        domain_data: domain_result
      };
    }

    renderJSON(request, reply, err, result);
  });
};

/**
 *
 * @param request
 * @param reply
 */
exports.indexes = function (request, reply) {
  console.log(request.auth.credentials.email);
  if (request.auth.credentials.email !== 'fedotov.evgenii@gmail.com' && request.auth.credentials.email !== 'victor@revsw.com') {
    return reply(boom.forbidden('Access denied'));
  }
  async.parallel({
    Company : function (cb) {
      accounts.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data)
      });
    },
    Domain : function (cb) {
      domains.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data)
      });
    },
    Location : function (cb) {
      locations.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data)
      });
    },
    User : function (cb) {
      users.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data)
      });
    },
    PurgeJob : function (cb) {
      purgeJobs.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data)
      });
    },
    MasterConfiguration : function (cb) {
      masterConf.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data)
      });
    },
    ServerGroup : function (cb) {
      serverGroups.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data)
      });
    }
  }, function (err, res) {
    if(err) {
      return reply(boom.badImplementation('Error retrieving indexes', err));
    }
    var result = {};
    _.forEach(res, function (obj, name) {
      result[name] = {};
      _.forEach(obj, function (data, key) {
        result[name][key] = {};
        result[name][key][data[0][0]] = data[0][1];
      })
    });
    renderJSON(request, reply, err, result);
  });
};
