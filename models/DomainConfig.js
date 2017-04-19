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
//	data access layer

var _ = require('lodash'),
  utils = require('../lib/utilities.js'),
  config = require('config'),
  promise = require('bluebird'),
  mongoose = require('mongoose');

function DomainConfig(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  var luaSchema = mongoose.Schema({
    'location': {type: String, default: ''},
    'code': {type: String, default: ''},
    'effective_location': {type: String, default: ''},
    'effective_code': {type: String, default: ''},
    'enable': {type: Boolean, default: false}
  }, { _id : false });

  this.DomainConfigSchema = new this.Schema({
    'name': {type: String, required: true},
    'BPGroup': {type: String, required: true},
    'COGroup': {type: String},
    'bp_apache_custom_config': {type: String},
    'bp_apache_fe_custom_config': {type: String},
    'co_apache_custom_config': {type: String},
    'co_cnames': {type: String},
    'account_id': {type: this.ObjectId},
    'config_command_options': {type: String},
    'tolerance': {type: Number},
    'rum_beacon_url': {type: String},
    'updated_at': {type: Date, default: Date.now},
    'created_at': {type: Date, default: Date.now},
    'created_by': {type: String},
    'domain_name': {type: String, lowercase: true},
    'deleted': {type: Boolean, default: false},
    'deleted_at': {type: Date},
    'deleted_by': {type: String},
    'operation': {type: String},
    'proxy_config': {},
    'published_domain_version': {type: Number, default: 0},
    'previous_domain_configs': [{}],
    'bp_lua_enable_all': {type: Boolean, default: false},
    'bp_lua': [luaSchema],
    'co_lua_enable_all': {type: Boolean, default: false},
    'co_lua': [luaSchema],
    'enable_enhanced_analytics': {type: Boolean, default: true}
  });

  this.model = connection.model('DomainConfig', this.DomainConfigSchema, 'DomainConfig');
}


// WTF? DomainConfigSchema missed a lot!
// {
//   "__v" : 1,
//   "_id" : ObjectId("56564344d5833c2d4240115f"),
//   "account_id" : ObjectId("5588869fbde7a0d00338ce8f"),
//   "bp_apache_custom_config" : "",
//   "bp_apache_fe_custom_config" : "",
//   "bp_group_id" : "55a56f85476c10c329a90740",
//   "cname" : "test-proxy-dsa-config.revsw.net.revqa.net",
//   "co_apache_custom_config" : "",
//   "config_command_options" : "  ",
//   "created_at" : ISODate("2015-11-25T23:23:58.989Z"),
//   "created_by" : "victor@revsw.com",
//   "deleted" : false,
//   "domain_name" : "test-proxy-dsa-config.revsw.net",
//   "last_published_domain_version" : 2,
//   "origin_server_location_id" : "5588868cbde7a0d00338ce8e",
//   "previous_domain_configs" : [....lot of weird stuff skipped....],
//   "proxy_config" : {....lot of weird stuff skipped....},
//   "published_domain_version" : 2,
//   "rum_beacon_url" : "https://rum01.revsw.net/service",
//   "serial_id" : 709,
//   "tolerance" : 3000,
//   "updated_at" : ISODate("2015-11-25T23:26:37.713Z")
// }



mongoose.set('debug', config.get('mongoose_debug_logging'));


DomainConfig.prototype = {

  get: function (item, callback) {
    this.model.findOne({_id: item, deleted: { $ne: true}}, function (err, _doc) {
      if (err) {
        callback(err);
      }
      var doc = utils.clone(_doc);
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

  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },


  /**
   *  domain's data for the given account
   *
   *  @param {[string,]|string|null} - account_id can be array of IDs, one ID(string) or
   *    nothing to return data for all accounts
   *  @param {Date|nothing} - ignore domains deleted before this date and created after, default today
   *  @return {promise({
   *    domain_to_acc_id_map: {
   *      domain_name: account_id,
   *      ...
   *    },
   *    domain_to_acc_id_wildcards: [{account_id,regex}]
   *  })}
   */
  accountDomainsData: function( account_id, day ) {

    day = day || new Date();
    day.setUTCHours( 0, 0, 0, 0 );  //  very begin of the day
    var where = {
      $or: [
        { deleted_at: { $gte: day } },
        { deleted: { $ne: true } }
      ],
      created_at: { $lte: ( new Date( day.valueOf() + 86400000/*day in ms*/ ) ) }
    };
    if ( account_id ) {
      where['proxy_config.account_id'] = _.isArray( account_id ) ? { $in: account_id } : account_id/*string*/;
    }

    return this.model.find( where, {
        _id: 0,
        domain_name: 1,
        'proxy_config.account_id': 1,
        'proxy_config.domain_aliases': 1,
        'proxy_config.domain_wildcard_alias': 1
      })
      .exec()
      .then( function( data ) {
        var map = {};
        var wildcards = [];
        data.forEach( function( item ) {

          //  domain mappings
          var accountID = item.proxy_config.account_id.toString();
          map[item.domain_name] = accountID;

          //  domain aliases mappings
          if ( item.proxy_config.domain_aliases && item.proxy_config.domain_aliases.length ) {
            item.proxy_config.domain_aliases.forEach( function( alias ) {
              map[alias] = accountID;
            });
          }
          //  domain wildcard aliases mappings
          if ( item.proxy_config.domain_wildcard_alias ) {
            if ( item.proxy_config.domain_wildcard_alias.constructor === Array ) {

              item.proxy_config.domain_wildcard_alias.forEach( function( wild ) {
                wildcards.push({
                  account_id: accountID,
                  wildcard: ( new RegExp( wild.replace( /\./g, '\\.' ).replace( /\*/g, '.*' ) ) )
                });
              });

            } else {
              wildcards.push({
                account_id: accountID,
                wildcard: ( new RegExp( item.proxy_config.domain_wildcard_alias
                              .replace( /\./g, '\\.' )
                              .replace( /\*/g, '.*' ) ) )
              });
            }
          }

        });
        return {
          domain_to_acc_id_map: map,
          domain_to_acc_id_wildcards: wildcards
        };
      });
  },

  /**
   *  domains numbers for the given account
   *
   *  @param {[string,]|string|null} - account_id can be array of IDs, one ID(string) or
   *    nothing to return data for all accounts
   *  @return {promise({
   *    account_domains_count: {
   *      account_id: {
   *        total: X, deleted: Y, active: Z
   *      }, ....
   *    }
   *  })}
   */
  accountDomainsCount: function( account_id ) {

    var where = {};
    if ( account_id ) {
     // NOTE: IMPORTANT!!! for find records used property "proxy_config.account_id" (not "account_id" in root )
     if ( _.isArray( account_id ) ) {
        where['proxy_config.account_id' ]= { $in: account_id.map( function( id ) {
          return  id ;
        }) };
      } else {
        where.account_id =   account_id ;
      }
    }

    return promise.all([
        this.model.aggregate([
          { $match: _.assign({ deleted: { $ne:true } }, where ) },
          { $group: {
            _id: '$proxy_config.account_id',
            count: { $sum: 1 },
            'total_enhanced_web_analytics':{$sum:{$cond:[{$eq:['$enable_enhanced_analytics', true]},1,0]}},
            'total_custom_vcl_feature':{$sum:{$cond:[{$eq:['$proxy_config.rev_component_bp.custom_vcl.enabled', true]},1,0]}},
            'ssl_enabled': {$sum:{$cond:[{$eq:['$enable_ssl', true]},1,0]}},
            'total_waf_feature': {$sum:{$cond:[{$eq:['$proxy_config.rev_component_bp.enable_waf', true]},1,0]}},
            // NOTE: bp_lua_enable_all or co_lua_enable_all (or both) attributes set to True
            'total_lua_feature': {$sum:{$cond:[{$or:[{$eq:['$bp_lua_enable_all',true]},{$eq:['$co_lua_enable_all',true]}]},1,0]}}
            }
          }
        ]).exec(),
        this.model.aggregate([
          { $match: where },
          { $group: { _id: '$proxy_config.account_id', count: { $sum: 1 } } }
        ]).exec()
      ])
      .then( function( counts ) {
        var hash = {};
        counts[1].forEach( function( doc ) {
          hash[doc._id.toString()] = { total: doc.count, active: 0, deleted: doc.count };
        });
        counts[0].forEach( function( doc ) {
          hash[doc._id.toString()].active = doc.count;
          hash[doc._id.toString()].deleted = hash[doc._id.toString()].total - doc.count;
          hash[doc._id.toString()].total_enhanced_web_analytics = doc.total_enhanced_web_analytics;
          hash[doc._id.toString()].total_custom_vcl_feature = doc.total_custom_vcl_feature;
          hash[doc._id.toString()].ssl_enabled = doc.ssl_enabled;
          hash[doc._id.toString()].total_waf_feature = doc.total_waf_feature;
          hash[doc._id.toString()].total_lua_feature = doc.total_lua_feature;
        });
        return hash;
      });
  },

  /**
   *  domain names list for the given account(s)
   *
   *  @param {[string,]|string|null} - account_id can be array of IDs, one ID(string) or
   *    nothing to return data for all accounts
   *  @param {Date|nothing} - ignore domains deleted before this date and created after, default today
   *  @return {promise([string,])}
   */
  domainsListForAccount: function( account_id, day ) {

    day = day || new Date();
    day.setUTCHours( 0, 0, 0, 0 );  //  very begin of the day
    var where = {
      $or: [
        { deleted_at: { $gte: day } },
        { deleted: { $ne: true } }
      ],
      created_at: { $lte: ( new Date( day.valueOf() + 86400000/*day in ms*/ ) ) }
    };
    if ( account_id ) {
      where['proxy_config.account_id'] = _.isArray( account_id ) ? { $in: account_id } : account_id/*string*/;
    }

    return this.model.find( where, {
        _id: 0,
        domain_name: 1,
        'proxy_config.domain_aliases': 1
      })
      .exec()
      .then( function( data ) {

        var domains = [];
        data.forEach( function( item ) {
          if ( item.proxy_config.domain_aliases ) {
            domains = domains.concat( item.proxy_config.domain_aliases );
          }
          domains.push( item.domain_name );
          //  TODO: whatta about wildcards ?
        });
        return domains;
      });
  },

  /**
   *  domain names list for the given account(s)
   *
   *  @param {[string,]|string|null} - account_id can be array of IDs, one ID(string) or
   *    nothing to return data for all accounts
   *  @param {Date|nothing} - ignore domains deleted before this date and created after, default today
   *  @return {promise({
   *    accID: [string,],
   *    accID: [string,],
   *  })}
   */
  domainsListForAccountGrouped: function( account_id, from, to ) {

    if ( !account_id ) {
      throw new Error( 'domainsListForAccountGrouped: account_id must be provided' );
    }

    from = from || new Date();
    from.setUTCHours( 0, 0, 0, 0 ); //  very beginning of the day
    to = to || new Date( from );
    to.setUTCHours( 24, 0, 0, 0 );  //  very beginning of the next day
    var where = {
      $or: [
        { deleted_at: { $gte: from } },
        { deleted: { $ne: true } }
      ],
      created_at: { $lt: to },
      'proxy_config.account_id': ( _.isArray( account_id ) ? { $in: account_id } : account_id )
    };

    return this.model.find( where, {
        _id: 0,
        deleted: 1,
        deleted_at: 1,
        'proxy_config.account_id': 1,
        domain_name: 1,
        'proxy_config.domain_aliases': 1
      })
      .exec()
      .then( function( data ) {
        var res = {};

        // console.log( data );

        data.forEach( function( item ) {
          if ( !item.proxy_config || !item.proxy_config.account_id ) {
            return;
          }
          var aid = item.proxy_config.account_id;
          if ( !res[aid] ) {
            res[aid] = [];
          }
          if ( item.proxy_config.domain_aliases ) {
            res[aid] = res[aid].concat( item.proxy_config.domain_aliases.map( function( alias ) {
              return { name: alias, deleted: item.deleted };
            }) );
          }
          res[aid].push({ name: item.domain_name, deleted: item.deleted });
          //  TODO: whatta about wildcards ?? (holy fuck!)
        });
        return res;
      });
  },
  /**
   * @name  infoUsedDomainConfigsInWAFRules
   * @description method get information about used WAF Rules in domain configuration
   * Group By WAF Rule ID
   * @param  {String} accountId
   * @param  {String|Array}   wafRulesId
   * @param  {Function} callback
   * @return {[type]}
   */
  infoUsedWAFRulesInDomainConfigs: function(accountId, wafRulesId, callback) {
    var context = this;
    var pipline = [];
    var $match = {
      'proxy_config.rev_component_bp.waf': { $exists: true },
      'proxy_config.rev_component_bp.waf.waf_rules': { $exists: true }
    };
    if (accountId) {
      if (_.isArray(accountId)) {
        $match['proxy_config.account_id']= {
          $in: accountId.map(function(id) {
            return id;
          })
        };
      } else {
        $match['proxy_confi.account_id'] = accountId;
      }
    }
    if (!!wafRulesId && wafRulesId.lenght > 0) {
      if (_.isArray(wafRulesId)) {
        $match._id = {
          $in: wafRulesId.map(function(id) {
            return mongoose.Types.ObjectId(id);
          })
        };
      } else {
        $match._id = mongoose.Types.ObjectId(wafRulesId);
      }
    }
    pipline.push({ $match: $match });
    pipline.push({
      $project: {
        'id': 1,
        account_id: '$proxy_config.account_id',
        domain_name: '$domain_name',
        domain_id: '$_id',
        waf_rules: '$proxy_config.rev_component_bp.waf.waf_rules'
      }
    });
    pipline.push({ $unwind: '$waf_rules' });
    pipline.push({ $unwind: '$waf_rules' });
    pipline.push({
      $group: {
        _id: {
          _id: '$waf_rules',
          account_id: '$account_id', // NOTE: see $project step. In this place '$account_id' means field '$proxy_config.account_id'
          domain_id: '$domain_id',
          domain_name: '$domain_name'
        },
        count: { '$sum': 1 }
      }
    });
    pipline.push({
      $project: {
        _id: 0,
        waf_rules: '$_id._id',
        domain_id: '$_id.domain_id',
        domain_name: '$_id.domain_name',
        account_id: '$_id.account_id', // NOTE: account_id equal 'proxy_config.account_id'(not 'account_id' from root )
        count: 1
      }
    });
    pipline.push({
      $group: {
        _id: '$waf_rules',
        count: { $sum: '$count' },
        domain_configs: {
          $push: { 'id': '$domain_id', account_id: '$account_id', domain_name: '$domain_name' }
        }
      }
    });
    this.model.aggregate(pipline, function(err, doc) {
      if (err) {
        callback(err);
      } else {
        callback(null, doc);
      }
    });
  }

};

module.exports = DomainConfig;
