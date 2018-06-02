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

function TrafficAlertConfig(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.TrafficAlertConfigSchema = new this.Schema({
    account_id: { type: mongoose.SchemaTypes.ObjectId },
    name: { type: String },
    target_type: { type: String },
    target: { type: String },
    rule_type: { type: String },
    rule_config: { type: Object },
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now() },
    created_by: { type: String },
    updated_at: { type: Date, default: Date.now() },
    updated_by: { type: String },
    notifications_list_id: { type: mongoose.SchemaTypes.ObjectId }
  });

  this.model = connection.model('TrafficAlertConfig', this.TrafficAlertConfigSchema, 'TrafficAlertConfig');
}

TrafficAlertConfig.prototype = {

  add: function (item) {
    var me = this;
    return new Promise(function (resolve, reject) {
      new me.model(item).save(function (err, TrafficAlertConfig) {
        if (err) {
          reject(err);
        } else if (TrafficAlertConfig) {
          TrafficAlertConfig = utils.clone(TrafficAlertConfig);
          TrafficAlertConfig.id = TrafficAlertConfig._id;

          delete TrafficAlertConfig.__v;
          delete TrafficAlertConfig._id;

          resolve(TrafficAlertConfig);
        } else {
          reject('Could not add TrafficAlertConfig');
        }
      });
    });
  },

  // Gets a TrafficAlertConfig
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
          reject('Could not find TrafficAlertConfig');
        }
      });
    });
  },

  // Gets a TrafficAlertConfig by ID
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
          reject('Could not find TrafficAlertConfig');
        }
      });
    });
  },

  /**
   * @name list
   * @description method get list of TrafficAlertConfigs data
   */
  list: function (params) {
    var me = this;
    return new Promise(function (resolve, reject) {
      var options = {};
      if (!!params.account_id) {
        options.account_id = { $in: _.isArray(params.account_id) ? params.account_id : [params.account_id] };
      }
      me.model.find(options, function (err, TrafficAlertConfigs) {
        if (err) {
          reject(err);
        } else if (TrafficAlertConfigs) {
          TrafficAlertConfigs = utils.clone(TrafficAlertConfigs);
          for (var i = 0; i < TrafficAlertConfigs.length; i++) {
            TrafficAlertConfigs[i].id = TrafficAlertConfigs[i]._id;
            delete TrafficAlertConfigs[i]._id;
          }

          resolve(TrafficAlertConfigs);
        }
      });
    });
  },

  // Updates a TrafficAlertConfig
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

  // Removes a TrafficAlertConfig
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

  // Removes a TrafficAlertConfig by ID
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

module.exports = TrafficAlertConfig;

