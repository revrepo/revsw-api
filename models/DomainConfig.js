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
var logger = require('revsw-logger')(config.log_config);

function DomainConfig(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

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
          // logger.debug('Processing domain ' + item.domain_name + ', proxy_config = ' + JSON.stringify(item.proxy_config));

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
      if ( _.isArray( account_id ) ) {
        where.account_id = { $in: account_id.map( function( id ) {
          return mongoose.Types.ObjectId( id );
        }) };
      } else {
        where.account_id = mongoose.Types.ObjectId( account_id );
      }
    }

    return promise.all([
        this.model.aggregate([
          { $match: _.assign({ deleted: { $ne:true } }, where ) },
          { $group: { _id: '$account_id', count: { $sum: 1 } } }
        ]).exec(),
        this.model.aggregate([
          { $match: where },
          { $group: { _id: '$account_id', count: { $sum: 1 } } }
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
          //  TODO: whatta about wildcards ?? (holy fuck!)
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
  domainsListForAccountGrouped: function( account_id, day ) {

    if ( !account_id ) {
      throw new Error( 'domainsListForAccountGrouped: account_id must be provided' );
    }

    day = day || new Date();
    day.setUTCHours( 0, 0, 0, 0 );  //  very begin of the day
    var where = {
      $or: [
        { deleted_at: { $gte: day } },
        { deleted: { $ne: true } }
      ],
      created_at: { $lte: ( new Date( day.valueOf() + 86400000/*day in ms*/ ) ) },
      'proxy_config.account_id': ( _.isArray( account_id ) ? { $in: account_id } : account_id )
    };

    return this.model.find( where, {
        _id: 0,
        deleted: 1,
        'proxy_config.account_id': 1,
        domain_name: 1,
        'proxy_config.domain_aliases': 1
      })
      .exec()
      .then( function( data ) {
        var res = {};
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
              return { name: alias, deleted: !!item.deleted };
            }) );
          }
          res[aid].push({ name: item.domain_name, deleted: !!item.deleted });
          //  TODO: whatta about wildcards ?? (holy fuck!)
        });
        return res;
      });
  }

};

module.exports = DomainConfig;
