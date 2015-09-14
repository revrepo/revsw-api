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

var utils = require('../lib/utilities.js'),
  autoIncrement = require('mongoose-auto-increment');


function PurgeJob(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.PurgeJobSchema = new this.Schema({
    'create_date_time': {
      type: Date, default: Date()
    },
    'proxy_fail_count': { type: Number, default: 0 },
    'proxy_list': { type: String, default: '' },
    'proxy_suc_count': { type: Number, default: 0 },
    'proxy_suc_list':  { type: String, default: '' },
    'req_status':  { type: String, default: 'pending' },
    'req_domain': String,
    'req_email': String,
    'req_id': String,
    'request_json': {
      'version': { type: Number, default: 0 },
      'purges': [{
        url: {
          is_wildcard: Boolean,
          expression: String,
          domain: String
        }
      }],
    },
    'request_process_time': {
      type: Date, default: Date()
    },
    'retry_proxy_list':  { type: String, default: '' },
  });

  autoIncrement.initialize(connection);
  this.PurgeJobSchema.plugin(autoIncrement.plugin, { model: 'purge_jobs', field: 'PurgeJobId' });
  this.model = connection.model('purge_jobs', this.PurgeJobSchema, 'purge_jobs');
}



PurgeJob.prototype = {

  // adds a new item
  add: function(item, callback) {
//    item.req_id = utils.generateID();
//    item.create_date_time = new Date();


    new this.model(item).save(function(err, item) {
//      console.log('Error = ', err);
      if (callback) {
        callback(err, item);
      }
    });
  },


  get: function(request_id, callback) {
    var context = this;
    if (request_id) {
      this.model.findOne({ 'req_id': request_id }, function(err, doc) {
        callback(err, doc);
      });
    } else {
      callback(utils.buildError('400', 'No purge job ID passed to find item'), null);
    }
  },

};


exports.PurgeJob = PurgeJob;
