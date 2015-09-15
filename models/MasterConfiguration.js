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

function MasterConfiguration(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.MasterConfigurationSchema = new this.Schema({

    'configurationJson' : {
      'domain_name'   : {type : String},
      'version'       : {type : String},
      'origin_domain' : {type : String},
      'operation'     : {type : String}
    },
    'id'                : {type : String},
    'domainName'        : {type : String},
    'created_at'        : {type : Date, default : Date()},
    'updated_at'        : {type : Date, default : Date()}
  });

  this.model = connection.model('MasterConfiguration', this.MasterConfigurationSchema, 'MasterConfiguration');
}

MasterConfiguration.prototype = {

  get : function (item, callback) {
    this.model.findOne(item, function (err, doc) {
      if (doc) {
        doc    = utils.clone(doc);
        doc.id = doc._id;

        delete doc.__v;
        delete doc._id;
      }
      callback(err, doc);
    });
  }

};

module.exports = MasterConfiguration;
