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
var _ = require('lodash');

// var utils = require('../lib/utilities.js');

function Location(mongoose, connection, options) {
  this.options = options;
  this.Schema = mongoose.Schema;
  this.ObjectId = this.Schema.ObjectId;

  this.LocationSchema = new this.Schema({
    'site_code_name'  : String,
    'city'  : String,
    'state'  : String,
    'country'    : String,
    'status': { type: String, default: 'online' }, // could be online or offline
    'visibility': { type: String, default: 'public' }, // could be public or private
    'billing_zone'  : String
  });

  this.model = connection.model('Location', this.LocationSchema, 'Location');
}

Location.prototype = {

  get : function (request, callback) {
    this.model.findOne(request, function (err, location) {
      callback(err, location);
    });
  },

  list : function (request, callback) {
    this.model.find(request, function (err, results) {
      callback(err, results);
    });
  },

  listLastMileLocations : function (callback) {
    this.model.find({ status: 'online', visibility: 'public' }, function (err, results) {
      callback(err, results);
    });
  },

  queryP: function (where, fields) {
    where = where || {};
    fields = fields || {};
    return this.model.find(where, fields).exec();
  },

  //  returns _promise_ {
  //    'IAD02': 'North America',
  //    'HKG03': 'Asia',
  //    ...
  //  }
  code2BillingZoneMapping: function() {

    return this.model.find( {}, { _id: 0, site_code_name: 1, billing_zone: 1 } )
      .exec()
      .then( function( data ) {
        var map = {};
        data.forEach( function( item ) {
          map[item.site_code_name] = item.billing_zone;
        });
        return map;
      });
  },

  listBillingZones: function(options, callback) {
    var conditions = { status: 'online', visibility: 'public' };
    return this.model.find(conditions, 'id site_code_name city state country billing_zone')
      .exec(
        function(err, results) {
          results = _.map(results, function(result) {
            return {
              id: result._id.toString(),
              site_code_name: result.site_code_name,
              city: result.city,
              state: result.state,
              country: result.country,
              billing_zone: result.billing_zone
            };
          });
          callback(err, results);
        });
  }

};

module.exports = Location;
