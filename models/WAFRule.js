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

var utils = require('../lib/utilities.js'),
  config = require('config'),
  autoIncrement = require('mongoose-auto-increment'),
  mongoose = require('mongoose'),
  _ = require('lodash');

//var WAFRuleConnection = mongoose.createConnection(config.get('portal_mongo.connect_string'));

function WAFRule(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.WAFRuleSchema = new this.Schema({
    'rule_name': {type: String, required: true},
    'rule_type': {type: String, required: true},
    'visibility': {type: String, required: true},
    'account_id': {type: this.ObjectId, required: true},
    'bp_group_id': {type: this.ObjectId, required: true},
    'updated_at': {type: Date, default: Date.now},
    'updated_by': {type: String},
    'created_at': {type: Date, default: Date.now},
    'created_by': {type: String},
    'deleted': {type: Boolean, default: false},
    'deleted_at': {type: Date},
    'deleted_by': {type: String},
    'operation': {type: String},
    'rule_body': {type: String},
    'published_waf_rule_version': {type: Number, default: 0},
    'last_published_waf_rule_version': {type: Number, default: 0},
    'comment': {type: String, default: ''},
    'previous_waf_rule_configs': [{}],
  });

  autoIncrement.initialize(connection);
  this.WAFRuleSchema.plugin(autoIncrement.plugin, { model: 'WAFRule', field: 'serial_id' });
  this.model = connection.model('WAFRule', this.WAFRuleSchema, 'WAFRule');
}

mongoose.set('debug', config.get('mongoose_debug_logging'));


WAFRule.prototype = {

  add: function (item, callback) {
    new this.model(item).save(function (err, item) {
      if (err) {
        callback(err);
      }
      callback(null, item);
    });
  },

  get: function (item, callback) {
    this.model.findOne({_id: item, deleted: { $ne: true}}, function (err, _doc) {
      if (err) {
        callback(err);
      }
      var doc = utils.clone(_doc);
      if (doc) {
        delete doc.__v;
        doc.id = doc._id;
        delete doc._id;
      }
      callback(null, doc);
    });
  },

  query: function (where, callback) {
    if (!where || typeof (where) !== 'object') {
      callback(new Error('where clause not specified'));
    }
    this.model.find(where, function (err, doc) {
      if (err) {
        callback(err);
      }
      if (doc) {
        doc = utils.clone(doc).map(function (r) {
          delete r.__v;
          return r;
        });
      }
      callback(null, doc);
    });
  },

  list: function (callback) {
    this.model.find({deleted: { $ne: true }}, function (err, domains) {
      if (err) {
        callback(err, null);
      }
      var results = domains.map(function (r) {
        delete r.__v;
        return r;
      });
      callback(err, results);
    });
  },

  update: function (item, callback) {
    this.model.findOne({_id: item.id}, function (err, doc) {
      if (err) {
        callback(err, null);
        return;
      }
      if (doc===null || item==null) {
        callback(null, null);
        return;
      }
      doc = _.assign(doc, item);
      if (doc===null) {
        console.log('wtf!');
        return;
      }
      doc.updated_at = new Date();
      delete doc.serial_id;
      doc.save(function (err, res) {
        if (err) {
          throw err;
        }
        callback(null, res);
      });
    });
  },

  remove: function (item, callback) {
    this.model.remove({_id: item._id}, function (err, doc) {
      if (err) {
        callback(err);
      }
      callback(null, doc);
    });
  },

  getHighestConfigId: function (callback) {
    var context = this;
    this.model.findOne({$query: {}, $orderby: {serial_id: -1}}, function (err, doc) {
      if (err) {
        callback(err);
      }
      if (!doc) {
        doc = {};
        doc.serial_id = 0;
      }
      callback(null, doc.serial_id);
    });
  },

  listNewJob: function (wafRuleVersion, callback) {
    var context = this;
    this.model.find({ $query: { serial_id: {$gt: wafRuleVersion}},  $orderby: {serial_id: 1}}, function (err, doc) {
      if (err) {
        callback(err);
      }
      if (doc) {
        doc = utils.clone(doc).map(function (r) {
          delete r.__v;
          r.id = r._id;
          delete r._id;
          return r;
        });
      }
      callback(null, doc);
    }).limit(1);
  },
  /**
   * @name findWAFRulesInfoByRulesIds
   * @description find WAR Rules by list of  WAF Rules Ids
   */
  findWAFRulesInfoByRulesIds: function(wafRulesId, callback){
    var $query = {
      delete: {$ne:true}
    };
    if(!!wafRulesId && wafRulesId.length > 0) {
      if(_.isArray(wafRulesId)) {
        $query._id = {
          $in: wafRulesId.map(function(id) {
            return mongoose.Types.ObjectId(id);
          })
        };
      } else {
        $query._id = mongoose.Types.ObjectId(wafRulesId);
      }

    this.model.find($query, function(err, doc) {
      if(err) {
        callback(err);
      }
      if(doc) {
        doc = utils.clone(doc).map(function(r) {
          delete r.__v;
          r.id = r._id;
          delete r._id;
          return r;
        });
      }
      callback(null, doc);
    });
    }else{
      callback(null,[]);
    }
  }
};

module.exports = WAFRule ;

