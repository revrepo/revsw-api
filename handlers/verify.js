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

var Account     = require('../models/Account');
var AuditEvents = require('../models/AuditEvents');
var DomainConfig      = require('../models/DomainConfig');
var Location    = require('../models/Location');
var PurgeJob    = require('../models/PurgeJob');
var User        = require('../models/User');
var ServerGroup = require('../models/ServerGroup');

var accounts      = new Account(mongoose, mongoConnection.getConnectionPortal());
var audit_events  = new AuditEvents(mongoose, mongoConnection.getConnectionPortal());
var domainConfigs       = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var locations     = new Location(mongoose, mongoConnection.getConnectionPortal());
var users         = new User(mongoose, mongoConnection.getConnectionPortal());
var purge_jobs    = new PurgeJob(mongoose, mongoConnection.getConnectionPurge());
var server_groups = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());

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
      accounts.list(function (err, accounts) {
        if (err) {
          cb(err);
        }
        cb(null, accounts);
      });
    },

    domainConfigs : function (cb) {
      domainConfigs.listAll(request, function (err, domainConfigs) {
        if (err) {
          cb(err);
        }
        cb(null, domainConfigs);
      });
    },

    users : function (cb) {
      users.listAll(request, function (err, users) {
        if (err) {
          cb(err);
        }
        cb(null, users);
      });
    },

    serverGroup : function (cb) {
      server_groups.listAll(function (err, serverGroup) {
        if (err) {
          cb(err);
        }
        cb(null, serverGroup);
      });
    }
  }, function (err, res) {
    if(err) {
      return reply(boom.badImplementation('Error in find data', err));
    }

    var broken_company_ids  = [];
    var broken_domain_names = [];
    var broken_bpgroup      = [];
    var broken_cogroup      = [];

    var user_result   = [];
    var domain_result = [];
    var config_result = [];

    var result = {};

    // check broken referenced company id/domain name in users
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

      broken_company_ids  = [];
      broken_domain_names = [];

      /*if (!_.isEmpty(broken_company_ids)) {
        _.remove(user.companyId, function (companyId) {
          return _.indexOf(broken_company_ids, companyId) !== -1
        });
      }*/

    });

    // check broken referenced company id/BPGroup/COGroup in domains
    _.forEach(res.domains, function (domain) {

      if (!_.findWhere(res.accounts, {'id' : domain.companyId})) {
        broken_company_ids.push(domain.companyId);
      }

      if (!_.findWhere(res.serverGroup, {'groupName' : domain.BPGroup, 'groupType' : 'BP'})) {
        broken_bpgroup.push(domain.BPGroup);
      }

      if (!_.findWhere(res.serverGroup, {'groupName' : domain.COGroup, 'groupType' : 'CO'})) {
        broken_cogroup.push(domain.COGroup);
      }

      if (!_.isEmpty(broken_company_ids) || !_.isEmpty(broken_bpgroup) || !_.isEmpty(broken_cogroup)){
        var broken_domain_data = {
          domain_id : domain.id
        };
      }

      if (!_.isEmpty(broken_company_ids)) {
        broken_domain_data.broken_company_ids = broken_company_ids;
      }

      if (!_.isEmpty(broken_bpgroup)) {
        broken_domain_data.broken_bpgroup = broken_bpgroup;
      }

      if (!_.isEmpty(broken_cogroup)) {
        broken_domain_data.broken_cogroup = broken_cogroup;
      }

      if (!_.isEmpty(broken_domain_data)) {
        domain_result.push(broken_domain_data);
      }

      broken_company_ids = [];
      broken_bpgroup     = [];
      broken_cogroup     = [];

    });

    // check broken referenced domain name in master configuration
    _.forEach(res.masterConfiguration, function (config) {

      if (!_.findWhere(res.domains, {'name' : config.domainName})) {
        broken_domain_names.push(config.domainName);
      }

      if (!_.isEmpty(broken_domain_names)) {
        var broken_domain_data = {
          config_id : config.id,
          broken_domain_names : broken_domain_names
        };
      }

      if (!_.isEmpty(broken_domain_data)) {
        config_result.push(broken_domain_data);
      }

      broken_domain_names = [];

    });


    if (!_.isEmpty(user_result)) {
      result.user_data = user_result;
    }

    if (!_.isEmpty(domain_result)) {
      result.domain_data = domain_result;
    }

    if (!_.isEmpty(config_result)) {
      result.master_configuration = config_result;
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
  if (request.auth.credentials.email !== 'fedotov.evgenii@gmail.com' && request.auth.credentials.email !== 'victor@revsw.com') {
    return reply(boom.forbidden('Access denied'));
  }
  async.parallel({

    AuditEvents : function (cb) {
      audit_events.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data);
      });
    },

    Company : function (cb) {
      accounts.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data);
      });
    },

    Domain : function (cb) {
      domainConfigs.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data);
      });
    },

    Location : function (cb) {
      locations.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data);
      });
    },

    User : function (cb) {
      users.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data);
      });
    },

    PurgeJob : function (cb) {
      purge_jobs.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data);
      });
    },

    ServerGroup : function (cb) {
      server_groups.model.collection.getIndexes(function (err, data) {
        if (err) {
          cb(err);
        }
        cb(null, data);
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
      });
    });
    renderJSON(request, reply, err, result);
  });
};
