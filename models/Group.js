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

/*jslint node: true */

'use strict';
//	data access layer

var utils = require('../lib/utilities.js');
var _ = require('lodash');
var Promise = require('bluebird');

function Group(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.GroupSchema = new this.Schema({
    id: String,
    name: String,
    comment: String,
    account_id: String,
    created_at: { type: Date, default: Date.now },
    created_by: String,
    updated_at: { type: Date, default: Date.now },
    permissions: {
      read_only: { type: Boolean, default: false },
      enforce_2fa: { type: Boolean, default: false },
      portal_login: { type: Boolean, default: true },
      API_access: { type: Boolean, default: true },
      dashboards: { type: Boolean, default: true },
      mobile_apps: {
        active: { type: Boolean, default: true },
        apps: [String]
      },
      ssl_names: { type: Boolean, default: true },
      ssl_certs: { type: Boolean, default: true },
      waf_rules: { type: Boolean, default: true },
      cache_purge: { type: Boolean, default: true },
      web_analytics: {
        active: { type: Boolean, default: true },
        domain_list: [String]
      },
      security_analytics: {
        active: { type: Boolean, default: true },
        domain_list: [String]
      },
      dns_zones: {
        active: { type: Boolean, default: true },
        zone_list: [String]
      },
      dns_analytics: { type: Boolean, default: true },
      groups: { type: Boolean, default: true },
      users: { type: Boolean, default: true },
      API_keys: { type: Boolean, default: true },
      logshipping_jobs: { type: Boolean, default: true },
      activity_log: { type: Boolean, default: true },
      accounts: {
        active: { type: Boolean, default: true },
        account_list: [String]
      },
      traffic_alerts: { type: Boolean, default: true },
      notification_lists: { type: Boolean, default: true },
      usage_reports: { type: Boolean, default: true },
      billing_statements: { type: Boolean, default: true },
      billing_plan: { type: Boolean, default: true }
    }
  });

  this.model = connection.model('Group', this.GroupSchema, 'Group');
}

Group.prototype = {

  // Groups will use promises instead of callbacks. make callbacks go away!

  // Adds a group
  add: function (item) {
    var me = this;
    return new Promise(function (resolve, reject) {
      new me.model(item).save(function (err, group) {
        if (err) {
          reject(err);
        } else if (group) {
          group = utils.clone(group);
          group.id = group._id;

          delete group.__v;
          delete group._id;

          resolve(group);
        } else {
          reject('Could not add group');
        }
      });
    });
  },

  // Gets a group
  get: function (item) {
    var me = this;
    return new Promise(function (resolve, reject) {
      me.model.findOne(item, function (err, doc) {
        if (err) {
          reject(err);
        } else if (doc) {
          doc = utils.clone(doc);
          doc.id = doc._id;
          resolve(doc);
        } else {
          reject('Could not find group');
        }
      });
    });
  },

  // Gets a group by ID
  getById: function (id) {
    var me = this;
    return new Promise(function (resolve, reject) {
      me.model.findById(id, function (err, doc) {
        if (err) {
          reject(err);
        } else if (doc) {
          doc = utils.clone(doc);
          doc.id = doc._id;
          resolve(doc);
        } else {
          reject('Could not find group');
        }
      });
    });
  },

  /**
   * @name list
   * @description method get list of groups data
   */
  list: function (params) {
    var me = this;
    return new Promise(function (resolve, reject) {
      var options = {};
      if (!!params.account_id) {
        if (_.isArray(params.account_id)) {
          options.$or = [];
          _.each(params.account_id, function (item) {
            options.$or.push({
              companyId: { $regex: item, $options: 'i' }
            });
          });
        } else {
          options.companyId = { $regex: params.account_id, $options: 'i' };
        }
      }
      me.model.find(options, function (err, groups) {
        if (err) {
          reject(err);
        } else if (groups) {
          groups = utils.clone(groups);
          for (var i = 0; i < groups.length; i++) {
            if (groups[i].companyId) {
              groups[i].companyId = groups[i].companyId.split(',');
            } else {
              groups[i].companyId = [];
            }

            groups[i].id = groups[i]._id;
            groups[i].two_factor_auth_enabled = groups[i].two_factor_auth_enabled || false;
            delete groups[i]._id;

            if (groups[i].domain && groups[i].domain !== '') {
              groups[i].domain = groups[i].domain.toLowerCase().split(',');
            } else {
              groups[i].domain = [];
            }
          }

          resolve(groups);
        }
      });
    });
  },

  // Updates a group
  update: function (item) {
    var me = this;
    return new Promise(function (resolve, reject) {
      me.model.findOne({ _id: item.id }, function (err, doc) {
        if (err) {
          reject(err);
        } else if (doc) {
          for (var attrname in item) {
            doc[attrname] = item[attrname];
          }
          doc.updated_at = new Date();
          doc.save(function (err, item) {
            if (err) {
              reject(err);
            } else if (item) {
              item = utils.clone(item);
              item.id = item._id;

              resolve(item);
            } else {
              reject('Something went wrong!');
            }
          });
        } else {
          reject('Something went wrong!');
        }
      });
    });
  },

  // Removes a group
  remove: function (item) {
    var me = this;
    return new Promise(function (resolve, reject) {
      if (item) {
        me.get(item, function (err, data) {
          if (err) {
            reject(err);
          } else if (data) {
            me.model.remove(item, function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(item);
              }
            });
          } else {
            reject('Something went wrong!');
          }
        });
      }
    });
  },

  // Removes a group by ID
  removeById: function (id) {
    var me = this;
    return new Promise(function (resolve, reject) {
      if (id) {
        me.model.remove({ _id: id }, function (err) {
          if (err) {
            reject(err);
          }

          resolve();
        });
      }
    });
  }
};

module.exports = Group;

