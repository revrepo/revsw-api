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

var utils = require('../lib/utilities.js');

function Domain(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.DomainSchema = new this.Schema({

    'BPGroup'                    : {type : String},
    'COGroup'                    : {type : String},
    'bp_apache_custom_config'    : {type : String},
    'bp_apache_fe_custom_config' : {type : String},
    'co_apache_custom_config'    : {type : String},
    'co_cnames'                  : {type : String},
    'companyId'                  : {type : String},
    'config_command_options'     : {type : String},
    'config_url'                 : {type : String},
    'cube_url'                   : {type : String},
    'id'                         : {type : String},
    'name'                       : {type : String},
    'nt_status'                  : {type : Boolean},
    'origin_domain'              : {type : String},
    'origin_server'              : {type : String},
    'rum_beacon_url'             : {type : String},
    'stats_url'                  : {type : String},
    'status'                     : {type : Boolean},
    'sync_status'                : {type : String},
    'tolerance'                  : {type : String},
    'webpagetest_url'            : {type : String},
    'created_at'                 : {type : Date, default : Date()},
    'updated_at'                 : {type : Date, default : Date()}
  });

  this.model = connection.model('Domain', this.DomainSchema, 'Domain');
}

Domain.prototype = {

  get : function (item, callback) {


    this.model.findOne(item, function (err, doc) {
      if (doc) {
        doc                    = utils.clone(doc);
        doc.id                 = doc._id + '';
        doc.origin_host_header = doc.origin_server;
        doc.origin_server      = doc.origin_domain;

        delete doc.__v;
        delete doc._id;
        if (doc.sync_status === null) {
          doc.sync_status = 'Unknown';
        }
      }
      callback(err, doc);
    });
  },

  list : function (request, callback) {
    this.model.find({}, function (err, domains) {
      if (err) {
        callback(err, null);
      }

//      console.log('inside domains.list - domains = ', domains);

      if (domains) {
        domains = utils.clone(domains);
        for (var i = 0; i < domains.length; i++) {

          // ignore domains without companyId set or with companyId not belonging
          // to the user or domain name not managed by the user
          if (!domains[i].companyId || request.auth.credentials.companyId.indexOf(domains[i].companyId) === -1 ||
            request.auth.credentials.domain.indexOf(domains[i].name) === -1) {
            domains.splice(i, 1);
            i--;
            continue;
          } else {
            domains[i].id = domains[i]._id;
            delete domains[i]._id;
            delete domains[i].__v;
            if (domains[i].sync_status === null) {
              domains[i].sync_status = 'Unknown';
            }
          }
        }
      }
//      console.log('inside domains.list, right before callback - domains = ', domains);
      callback(err, domains);
    });
  },

  listAll : function (request, callback) {
    this.model.find({}, function (err, domains) {
      if (err) {
        callback(err, null);
      }
      if (domains) {
        domains = utils.clone(domains);

        for (var i = 0; i < domains.length; i++) {
          domains[i].id = domains[i]._id;

          delete domains[i]._id;
          delete domains[i].__v;

          if (domains[i].sync_status === null) {
            domains[i].sync_status = 'Unknown';
          }
        }
      }
      callback(err, domains);
    });
  }

};

module.exports = Domain;
