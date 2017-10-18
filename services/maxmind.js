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

var config = require('config');
var maxmind = require('maxmind');
// TODO: move db locations to config?
var ispsync = maxmind.openSync('./maxminddb/GeoIP2-ISP.mmdb');
var citysync = maxmind.openSync('./maxminddb/GeoIP2-City.mmdb');
var countrysync = maxmind.openSync('./maxminddb/GeoIP2-Country.mmdb');
var ipregex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

/**
 * @name  getCity
 * @description get the city info about the ip
 *
 * @param  {[String]}   ip [description]
 */
exports.getCity = function(ip) {
    if (ip !== undefined && ip !== '' && ipregex.test(ip)) {
        // if provided ip is not empty and passes regex test for ip structure return data
        var res = citysync.get(ip);
        if (res !== null) {
            if (res.city === undefined) {
                // sometimes theres no city data -- return country instead
                return res.country.names.en;
            } else {
                return res.city.names.en;
            }
        } else {
            return 'No data';
        }
    }    
};

/**
 * @name  getISP
 * @description get the ISP info about the ip
 *
 * @param  {[String]}   ip the provided ip
 */
exports.getISP = function(ip) {    
    if (ip !== undefined && ip !== '' && ipregex.test(ip)) {
        // if provided ip is not empty and passes regex test for ip structure return data
        var res = ispsync.get(ip);
        if (res !== null && res.isp !== undefined) {
            return res.isp;
        } else {
            return 'No data';
        }
    }    
};

/**
 * @name  getCountry
 * @description get the country info about the ip
 *
 * @param  {[String]}   ip the provided ip
 */
exports.getCountry = function(ip) {    
    if (ip !== undefined && ip !== '' && ipregex.test(ip)) {
        // if provided ip is not empty and passes regex test for ip structure return data
        var res = countrysync.get(ip);
        if (res !== null && res.country !== undefined) {
            return res.country.names.en;
        } else {
            return 'No data';
        }
    }    
};