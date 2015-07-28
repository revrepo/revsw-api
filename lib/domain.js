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

    'BPGroup': { type: String },
    'COGroupx': { type: String },
    'bp_apache_custom_config': { type: String },
    'bp_apache_fe_custom_config': { type: String },
    'co_apache_custom_config': { type: String },
    'co_cnames': { type: String },
    'companyId': { type: String },
    'config_command_options': { type: String },
    'config_url': { type: String },
    'cube_url': { type: String },
    'id': { type: String },
    'name': { type: String },
    'nt_status': { type: Boolean },
    'origin_domain': { type: String },
    'origin_server': { type: String },
    'rum_beacon_url': { type: String },
    'stats_url': { type: String },
    'status': { type: Boolean },
    'sync_status': { type: String },
    'tolerance': { type: String },
    'webpagetest_url': { type: String },
    'created_at': { type: Date, default: Date() },
    'updated_at': { type: Date, default: Date() }
  });

  this.model = connection.model('Domain', this.DomainSchema, 'Domain');
}

Domain.prototype = {

  get: function(item, callback) {

    console.log('Inside get. item = ', item);

    this.model.findOne( item, function(err, doc) {
      console.log('Inside get. Received err = ', err);
      console.log('Inside get. Received doc = ', doc);
      if(doc) {   
        doc = utils.clone(doc);
        doc.id = doc._id;
        delete doc.__v;
        delete doc._id;
      }
      callback(err, doc);
    });
  }, 

  list: function(request, callback) {
    this.model.find( { companyId: request.auth.credentials.companyId }, function (err, domains) {
      if (domains) {
        domains = utils.clone(domains);
        for (var i = 0; i < domains.length; i++ ) {
          domains[i].id = domains[i]._id;
          delete domains[i]._id; 
          delete domains[i].__v; 
        }
      }
  //    console.log('Inside list, users = ', users);
      callback(err, domains);
    });
  }
};

exports.Domain = Domain;
