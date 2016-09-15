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

var marked = require('marked'),
    hapi = require('hapi'),
    crypto = require('crypto'),
    fs = require('fs'),
    config = require('config'),
    jwt = require('jsonwebtoken');

var base64url = require('base64-url');
var base64 = require('js-base64').Base64;
var ursa = require('ursa');
var zlib = require('zlib');
var atob = require('atob');

var logger = require('revsw-logger')(config.log_config);

require('datejs');

module.exports = {

  decodeSSOToken: function(token) {


    // This private key will be used to sign the SSO token
    var key = ursa.createPrivateKey(fs.readFileSync(config.get('azure_marketplace.sso_private_key')));
    // This public key will be used to encrypt the SSO token
    var pubkey = ursa.createPublicKey(fs.readFileSync(config.get('azure_marketplace.sso_public_key')));

    // URL-decode the token
    var tokenDecoded = JSON.parse(this.webURLDecoding(token));
    // Now let's decompress the token
    logger.debug('tokenDecoded = ', tokenDecoded);
    var signedHash = tokenDecoded.signedHash;
    var encryptedData = tokenDecoded.encryptedData;
    var secretToken = tokenDecoded.secretToken;
    var secretTokenJson = JSON.parse(key.decrypt(secretToken, 'base64', 'utf8'));
    logger.debug('secretTokenJson = ', secretTokenJson);
    var sharedSecret = atob(secretTokenJson.symmetricKey);
    var initializationVector = atob(secretTokenJson.iv);

    logger.debug('sharedSecret = ', sharedSecret);
    logger.debug('initializationVector = ', initializationVector);

    // Performing symmetric decryption of the appToken
    var appToken = '';
    var decipher = crypto.Decipheriv('aes-256-cbc', sharedSecret, initializationVector);
    appToken += decipher.update(encryptedData, 'base64', 'utf8');
    appToken += decipher.final('utf8');

    logger.debug('appToken = ', appToken);

    // TODO add signature verification?
    return JSON.parse(appToken);
    
  },

  // This function uses base64-url library to do URL encoding
  webURLEncoding: function(data) {
    var encodedData = base64url.encode(data);
    return encodedData;
  },


  // This function uses base64-url library to do URL decoding
  webURLDecoding: function(data) {
    var decodedData = base64url.decode(data);
    return decodedData;
  },

  // Return API user IP address
  getAPIUserRealIP: function(request) {
    if (config.get('trust_request_xff_header')) {
      var xFF = request.headers['x-forwarded-for'];
    }
    var ip = xFF ? xFF.split(',')[0] : request.info.remoteAddress;
    return ip;
  },

  isUserAdmin: function(request) {
    return request.auth.credentials.role === 'revadmin';
  },

  checkUserAccessPermissionToSSLName: function(request, sslName) {

    switch (request.auth.credentials.user_type) {
      case 'user':
        if (request.auth.credentials.role === 'revadmin' || request.auth.credentials.companyId.indexOf(sslName.account_id) !== -1) {
          return true;
        } else {
          return false;
        }
        break;

      case 'apikey':
        if (request.auth.credentials.account_id === sslName.account_id) {
          return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },

  checkUserAccessPermissionToLogShippingJob: function(request, job) {

    switch (request.auth.credentials.user_type) {
      case 'user':
        if (request.auth.credentials.role === 'revadmin' || request.auth.credentials.companyId.indexOf(job.account_id) !== -1) {
          return true;
        } else {
          return false;
        }
        break;

      case 'apikey':
        if (request.auth.credentials.account_id === job.account_id) {
          return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },

  checkUserAccessPermissionToSSLCertificate: function(request, cert) {

    // Only revadmin role can manage shared SSL certs
    if (cert.cert_type === 'shared') {
      if (request.auth.credentials.user_type === 'user' && request.auth.credentials.role === 'revadmin') {
        return true;
      } else {
        return false;
      }
    }

    switch (request.auth.credentials.user_type) {
      case 'user':
        if (request.auth.credentials.role !== 'revadmin' && request.auth.credentials.companyId.indexOf(cert.account_id) === -1) {
          return false;
        }
        return true;

      case 'apikey':
        if (request.auth.credentials.account_id === cert.account_id) {
          return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },


  // TODO add handling of user role
  checkUserAccessPermissionToAccount: function(request, account_id) {

    switch (request.auth.credentials.user_type) {
      case 'user':
        var role = request.auth.credentials.role;

        if(role === 'revadmin') {
          return true;
        }

        if((role === 'admin' || role === 'reseller' || role === 'user') &&
            request.auth.credentials.companyId.indexOf(account_id) !== -1) {
          return true;
        }

        return false;
      case 'apikey':
        if (request.auth.credentials.account_id === account_id) {
          return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },

  checkUserAccessPermissionToAPIKey : function(request, apiKey){

    switch (request.auth.credentials.user_type) {
      case 'user':
        if (request.auth.credentials.role !== 'revadmin' && request.auth.credentials.companyId.indexOf(apiKey.account_id) === -1) {
          return false;
        }
        return true;

      case 'apikey':
        if (request.auth.credentials.account_id === apiKey.account_id) {
          return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },

  checkUserAccessPermissionToApps : function(request, app){

    switch (request.auth.credentials.user_type) {
      case 'user':
        if (request.auth.credentials.role !== 'revadmin' && request.auth.credentials.companyId.indexOf(app.account_id) === -1) {
          return false;
        }
        return true;

      case 'apikey':
        if (request.auth.credentials.account_id === app.account_id) {
          return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },

  checkUserAccessPermissionToUser: function(request, userObject) {

    switch (request.auth.credentials.user_type) {
      case 'user':
        if ((request.auth.credentials.role !== 'reseller' && request.auth.credentials.role !== 'revadmin') && userObject.role === 'reseller') {
          return false;
        }

        if (request.auth.credentials.role === 'reseller' &&
          (userObject.companyId && !this.areOverlappingArrays(userObject.companyId, request.auth.credentials.companyId))) {
          return false;
        }

        if (request.auth.credentials.role === 'user' && (request.auth.credentials.user_id !== userObject.user_id)) {
          return false;
        }

        if (userObject.role === 'revadmin' && request.auth.credentials.role !== 'revadmin') {
          return false;
        }

        if (request.auth.credentials.role === 'revadmin' ||
            (userObject.companyId && this.areOverlappingArrays(userObject.companyId, request.auth.credentials.companyId))) {
          return true;
        }

        return true;
      case 'apikey':
        if (this.areOverlappingArrays(this.getAccountID(request), userObject.companyId)) {
         if(userObject.user_id === undefined){
          if(userObject.role === 'admin' || userObject.role === 'user'){ // NOTE: can be created only 'user' or 'admin'
            return true;
          }
          return false;
          // NOTE: this rules will be used later
          // if(request.auth.credentials.read_only_status === true || request.auth.credentials.allowed_ops.admin === false){
          //   return false;
          // }
          // if(request.auth.credentials.allowed_ops.admin === true && (userObject.role === 'revadmin' || userObject.role === 'reseller')){
          //   return false;
          // }
         }
         return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },
  //
  // Check that user (in HAPI request object) is allowed to access a domain specified in domainObject argument
  //
  checkUserAccessPermissionToDomain: function(request, domainObject) {

    // Since domain list and single domain objects have the account_id attribute on different levels we need to use a proper field
    var accountId = (domainObject.proxy_config) ? domainObject.proxy_config.account_id : domainObject.account_id;

    switch (request.auth.credentials.user_type) {
      case 'user':
        // Allow full access to Revadmin role
        if (request.auth.credentials.role === 'revadmin') {
          return true;
          // Allow access to Admin and Reseller who manage the company
        } else if ((request.auth.credentials.role === 'reseller' || request.auth.credentials.role === 'admin') &&
          (request.auth.credentials.companyId.indexOf(accountId) !== -1)) {
          return true;
          // For user role allow the access only if the user belongs to the company and has permissions to manage the specific domain
        } else if ((request.auth.credentials.role === 'user' && request.auth.credentials.companyId.indexOf(accountId) !== -1 &&
          request.auth.credentials.domain.indexOf(domainObject.domain_name) !== -1)) {
          return true;  // allow access
        } else {
          return false;  // deny access
        }

        return true;
      case 'apikey':
        if (request.auth.credentials.account_id === accountId) {
          return true;
        } else {
          return false;
        }
        break;

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
        break;
    }
    return false;
  },

  checkUserAccessPermissionToDashboard: function(request, dashboardObject) {
    if (request.auth.credentials.user_id === dashboardObject.user_id) {
      return true;
    }
    return false;
  },
  //
  // Check that user (in HAPI request object) is allowed to access add new User
  //
  checkUserAccessPermissionToAddNewUser: function(request, newUserData) {
    if (request.auth.credentials.role !== 'revadmin' && !this.isArray1IncludedInArray2(newUserData.companyId, this.getAccountID(request))) {
      return true;
    }
    return false;
  },
  //
  // Check that user (in HAPI request object) is allowed to access a dns zone specified in dnsZoneObject argument
  //
  checkUserAccessPermissionToDNSZone: function(request, dnsZoneObject) {
    switch (request.auth.credentials.user_type) {
      case 'user':
        return (request.auth.credentials.role === 'revadmin' ||
            request.auth.credentials.companyId.indexOf(dnsZoneObject.account_id) !== -1);

      case 'apikey':
        //  why the hell so complicated ?:
        // if (request.auth.credentials.account_id === dnsZoneObject.account_id) {
        //   return true;
        // } else {
        //   return false;
        // }
        // break;
        return ( request.auth.credentials.account_id === dnsZoneObject.account_id );

      default:
        logger.error('Missing or wrong "user_type" attribute in "request" object ' + JSON.stringify(request.auth.credentials));
    }
    return false;
  },
  /**
   * Generate random token
   *
   * @return {string}
   */
  generateToken : function() {
    var buf = crypto.randomBytes(20);
    return buf.toString('hex');
  },

  // read a file and converts the markdown to HTML
  getMarkDownHTML : function (path, callback) {
    fs.readFile(path, 'utf8', function (err, data) {
      if (!err) {
        marked.setOptions({
          gfm         : true,
          tables      : true,
          breaks      : false,
          pedantic    : false,
          sanitize    : true,
          smartLists  : true,
          smartypants : false,
          langPrefix  : 'language-',
          highlight   : function (code/*, lang*/) {
            return code;
          }
        });
        data = marked(data);
      }
      callback(err, data);
    });
  },

  generateID : function () {
    return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).substr(-4);
  },

  buildError : function (code, err) {
    var error = hapi.error.badRequest(err);
    error.output.statusCode = code;
    error.reformat();
    return error;
  },

  clone : function (obj) {
    return (JSON.parse(JSON.stringify(obj)));
  },

  isString : function (obj) {
    return typeof(obj) === 'string';
  },

  isNumber : function (o) {
    return typeof(o) === 'number' || (typeof(o) === 'object' && o.constructor === Number);
  },

  trim : function (str) {
    return str.replace(/^\s+|\s+$/g, '');
  },

  isArray : function (obj) {
    return obj && !(obj.propertyIsEnumerable('length')) && typeof obj === 'object' && typeof obj.length === 'number';
  },

  areOverlappingArrays : function (array1, array2) {
    for (var i = 0; i < array1.length; i++) {
      if (array2.indexOf(array1[i]) !== -1) {
        return true;
      }
    }
    return false;
  },

  isArray1IncludedInArray2 : function (array1, array2) {
    for (var i = 0; i < array1.length; i++) {
      if (array2.indexOf(array1[i]) === -1) {
        return false;
      }
    }
    return true;
  },

  getHash : function (password) {
    return crypto.createHash('md5').update(password).digest('hex');
  },

  /**
   * creates indices list from the time span, like "logstash-2015.11.14,logstash-2015.11.15,...." or "sdkstats-2015.11.14,...."
   * used in functions doing ElasticSearch calls
   *
   * @param {Number} Unix timestamp
   * @param {Number} Unix timestamp
   * @param {String} index name prefix, "logstash-"(default) or "sdkstats-"
   */
  buildIndexList : function (start_time, end_time, prefix) {
    prefix = prefix || 'logstash-';
    var d_start = new Date(start_time),
      day_ms = 24 * 3600000,
      list = prefix + d_start.getUTCFullYear() + '.' + ('0' + (d_start.getUTCMonth() + 1)).slice(-2) + '.' + ('0' + d_start.getUTCDate()).slice(-2);

    // end_time = Math.floor( end_time / day_ms + 1 ) * day_ms;
    end_time = ( Math.floor( ( end_time - 1 ) / day_ms ) + 1 ) * day_ms;
    for ( var d = start_time + day_ms; d < end_time; d += day_ms ) {
      var d_curr = new Date( d );
      list += ',' + prefix + d_curr.getUTCFullYear() + '.' + ('0' + (d_curr.getUTCMonth() + 1)).slice(-2) + '.' + ('0' + d_curr.getUTCDate()).slice(-2);
    }
    return list;
  },

  /**
   *
   * @param {String} [date]
   */
  convertDateToTimestamp : function (date) {
    if (Date.parse(date)) {
      return (Date.parse(date).getTime());
    }
    if (parseInt(date)) {
      return parseInt(date);
    }
    return false;
  },

  /**
   * the only reason to wrap such trivial code into a function - to create one point of resposibility
   *
   * @param  {int} from - start of timespan, ms
   * @param  {int} to - end of timespan, ms
   * @return {int} interval
   */
  span2Interval: function( from, to ) {
    var delta = to - from;
    if (delta <= 3 * 3600000 ) {
      return 5 * 60000; // 5 minutes
    }
    if (delta <= 2 * 24 * 3600000) {
      return 30 * 60000; // 30 minutes
    }
    if (delta <= 8 * 24 * 3600000) {
      return 3 * 3600000; // 3 hours
    }
    return 12 * 3600000; // 12 hours
  },

  /**
   * creates time span from the given query and parameters and round time
   *
   * @param {Object} query
   * @param {int} default value of start in hours back from now
   * @param {int} maximum allowed period in hours
   * @param {bool} time should be rounded to 5 min, optional, default true
   * @returns {object} {
   *    error: false,
   *    start: 000,
   *    end: 000,
   *    interval: 000
   *  }
   */
  query2Span: function( query, hrs_back, hrs_allowed, toRound ) {

    toRound = toRound || ( toRound === undefined );
    var span = {
        error: false,
        start: 0,
        end: 0,
        interval: 0
      },
      now = Date.now();

    if ( query.from_timestamp ) {
      span.start = this.convertDateToTimestamp( query.from_timestamp );
      if ( !span.start ) {
        span.error = 'Cannot parse the from_timestamp value';
        return span;
      }
    } else {
      span.start = now - 3600000 * hrs_back;
    }

    if ( query.to_timestamp ) {
      span.end = this.convertDateToTimestamp( query.to_timestamp );
      if ( !span.end ) {
        span.error = 'Cannot parse the to_timestamp value';
        return span;
      }
    } else {
      span.end = query.to_timestamp || now;
    }

    logger.debug('query2Span: span = ' + JSON.stringify(span));

    if ( span.start >= span.end ) {
      span.error = 'Period end timestamp cannot be less or equal period start timestamp';
      return span;
    }
    if ( ( span.end - span.start ) > ( hrs_allowed * 3600000 + 10000/*loose it a little*/ ) ) {
      span.error = 'Too big requested report period';
      return span;
    }

    if ( toRound ) {
      //  5 min round
      span.start = Math.floor(span.start / 300000) * 300000;
      span.end = Math.floor(span.end / 300000) * 300000;
    }
    span.interval = this.span2Interval( span.start, span.end );

    return span;
  },

  generateCreatedByField: function(request){
    return request.auth.credentials.email || ('API Key ' + request.auth.credentials.id);
  },

  getAccountID: function(request, asID){
    switch(request.auth.credentials.user_type){
      case 'user':
        return request.auth.credentials.companyId;
      case 'apikey':
        var accountID = request.auth.credentials.account_id || request.query.account_id || request.params.account_id;
        return asID ? accountID : [accountID];
    }

    return '';
  },

  generateJWT: function(user) {
    return jwt.sign({
      user_id: user.user_id,
      password: user.password
    }, config.get('jwt_private_key'), {
      expiresIn: config.get('jwt_token_lifetime_minutes') * 60
    });
  }

};

module.exports.countries = {
  'US' : 'United States',
  'AF' : 'Afghanistan',
  'AX' : 'Aland Islands',
  'AL' : 'Albania',
  'DZ' : 'Algeria',
  'AS' : 'American Samoa',
  'AD' : 'Andorra',
  'AO' : 'Angola',
  'AI' : 'Anguilla',
  'A1' : 'Anonymous Proxy',
  'AQ' : 'Antarctica',
  'AG' : 'Antigua and Barbuda',
  'AR' : 'Argentina',
  'AM' : 'Armenia',
  'AW' : 'Aruba',
  'AP' : 'Asia/Pacific Region',
  'AU' : 'Australia',
  'AT' : 'Austria',
  'AZ' : 'Azerbaijan',
  'BS' : 'Bahamas',
  'BH' : 'Bahrain',
  'BD' : 'Bangladesh',
  'BB' : 'Barbados',
  'BY' : 'Belarus',
  'BE' : 'Belgium',
  'BZ' : 'Belize',
  'BJ' : 'Benin',
  'BM' : 'Bermuda',
  'BT' : 'Bhutan',
  'BO' : 'Bolivia',
  'BQ' : 'Bonaire, Saint Eustatius and Saba',
  'BA' : 'Bosnia and Herzegovina',
  'BW' : 'Botswana',
  'BV' : 'Bouvet Island',
  'BR' : 'Brazil',
  'IO' : 'British Indian Ocean Territory',
  'BN' : 'Brunei Darussalam',
  'BG' : 'Bulgaria',
  'BF' : 'Burkina Faso',
  'BI' : 'Burundi',
  'CM' : 'Cameroon',
  'KH' : 'Cambodia',
  'CA' : 'Canada',
  'CV' : 'Cape Verde',
  'KY' : 'Cayman Islands',
  'CF' : 'Central African Republic',
  'TD' : 'Chad',
  'CL' : 'Chile',
  'CN' : 'China',
  'CX' : 'Christmas Island',
  'CC' : 'Cocos (Keeling) Islands',
  'CO' : 'Colombia',
  'KM' : 'Comoros',
  'CG' : 'Congo',
  'CD' : 'Congo, The Democratic Republic of the',
  'CK' : 'Cook Islands',
  'CR' : 'Costa Rica',
  'CI' : 'Cote d\'Ivoire',
  'HR' : 'Croatia',
  'CU' : 'Cuba',
  'CW' : 'Curacao',
  'CY' : 'Cyprus',
  'CZ' : 'Czech Republic',
  'DK' : 'Denmark',
  'DJ' : 'Djibouti',
  'DM' : 'Dominica',
  'DO' : 'Dominican Republic',
  'EC' : 'Ecuador',
  'EG' : 'Egypt',
  'SV' : 'El Salvador',
  'GQ' : 'Equatorial Guinea',
  'ER' : 'Eritrea',
  'EE' : 'Estonia',
  'ET' : 'Ethiopia',
  'EU' : 'Europe',
  'FK' : 'Falkland Islands (Malvinas)',
  'FO' : 'Faroe Islands',
  'FI' : 'Finland',
  'FJ' : 'Fiji',
  'FR' : 'France',
  'GF' : 'French Guiana',
  'PF' : 'French Polynesia',
  'TF' : 'French Southern Territories',
  'GA' : 'Gabon',
  'GM' : 'Gambia',
  'GE' : 'Georgia',
  'DE' : 'Germany',
  'GH' : 'Ghana',
  'GI' : 'Gibraltar',
  'GR' : 'Greece',
  'GL' : 'Greenland',
  'GD' : 'Grenada',
  'GP' : 'Guadeloupe',
  'GU' : 'Guam',
  'GT' : 'Guatemala',
  'GN' : 'Guinea',
  'GW' : 'Guinea-Bissau',
  'GG' : 'Guernsey',
  'GY' : 'Guyana',
  'HT' : 'Haiti',
  'HM' : 'Heard Island and McDonald Islands',
  'HN' : 'Honduras',
  'HK' : 'Hong Kong',
  'HU' : 'Hungary',
  'IS' : 'Iceland',
  'IN' : 'India',
  'ID' : 'Indonesia',
  'IR' : 'Iran',
  'IQ' : 'Iraq',
  'IE' : 'Ireland',
  'IM' : 'Isle of Man',
  'IL' : 'Israel',
  'IT' : 'Italy',
  'JM' : 'Jamaica',
  'JP' : 'Japan',
  'JE' : 'Jersey',
  'JO' : 'Jordan',
  'KZ' : 'Kazakhstan',
  'KE' : 'Kenya',
  'KI' : 'Kiribati',
  'KW' : 'Kuwait',
  'KG' : 'Kyrgyzstan',
  'LA' : 'Lao People\'s Democratic Republic',
  'LV' : 'Latvia',
  'LB' : 'Lebanon',
  'LR' : 'Liberia',
  'LY' : 'Libyan Arab Jamahiriya',
  'LI' : 'Liechtenstein',
  'LT' : 'Lithuania',
  'LS' : 'Lesotho',
  'LU' : 'Luxembourg',
  'MO' : 'Macao',
  'MK' : 'Macedonia',
  'MG' : 'Madagascar',
  'MY' : 'Malaysia',
  'MW' : 'Malawi',
  'ML' : 'Mali',
  'MT' : 'Malta',
  'MV' : 'Maldives',
  'MH' : 'Marshall Islands',
  'MQ' : 'Martinique',
  'MR' : 'Mauritania',
  'MU' : 'Mauritius',
  'YT' : 'Mayotte',
  'MX' : 'Mexico',
  'FM' : 'Micronesia',
  'MD' : 'Moldova',
  'MC' : 'Monaco',
  'MN' : 'Mongolia',
  'MS' : 'Montserrat',
  'ME' : 'Montenegro',
  'MA' : 'Morocco',
  'MZ' : 'Mozambique',
  'MM' : 'Myanmar',
  'NA' : 'Namibia',
  'NR' : 'Nauru',
  'NP' : 'Nepal',
  'NL' : 'Netherlands',
  'NC' : 'New Caledonia',
  'NZ' : 'New Zealand',
  'NI' : 'Nicaragua',
  'NE' : 'Niger',
  'NG' : 'Nigeria',
  'NU' : 'Niue',
  'NF' : 'Norfolk Island',
  'MP' : 'Northern Mariana Islands',
  'KP' : 'North Korea',
  'NO' : 'Norway',
  'OM' : 'Oman',
  'O1' : 'Other Country',
  'PK' : 'Pakistan',
  'PW' : 'Palau',
  'PS' : 'Palestinian Territory',
  'PA' : 'Panama',
  'PG' : 'Papua New Guinea',
  'PY' : 'Paraguay',
  'PE' : 'Peru',
  'PH' : 'Philippines',
  'PN' : 'Pitcairn',
  'PL' : 'Poland',
  'PT' : 'Portugal',
  'PR' : 'Puerto Rico',
  'QA' : 'Qatar',
  'RE' : 'Reunion',
  'RO' : 'Romania',
  'RU' : 'Russian Federation',
  'RW' : 'Rwanda',
  'A2' : 'Satellite Provider',
  'WS' : 'Samoa',
  'SM' : 'San Marino',
  'ST' : 'Sao Tome and Principe',
  'BL' : 'Saint Bartelemey',
  'SH' : 'Saint Helena',
  'KN' : 'Saint Kitts and Nevis',
  'LC' : 'Saint Lucia',
  'MF' : 'Saint Martin',
  'PM' : 'Saint Pierre and Miquelon',
  'VC' : 'Saint Vincent and the Grenadines',
  'SA' : 'Saudi Arabia',
  'SN' : 'Senegal',
  'RS' : 'Serbia',
  'SC' : 'Seychelles',
  'SG' : 'Singapore',
  'SX' : 'Sint Maarten',
  'SL' : 'Sierra Leone',
  'SK' : 'Slovakia',
  'SI' : 'Slovenia',
  'SB' : 'Solomon Islands',
  'SO' : 'Somalia',
  'ZA' : 'South Africa',
  'GS' : 'South Georgia and the South Sandwich Islands',
  'KR' : 'South Korea',
  'SS' : 'South Sudan',
  'ES' : 'Spain',
  'LK' : 'Sri Lanka',
  'SD' : 'Sudan',
  'SR' : 'Suriname',
  'SJ' : 'Svalbard and Jan Mayen',
  'SZ' : 'Swaziland',
  'SE' : 'Sweden',
  'CH' : 'Switzerland',
  'SY' : 'Syrian Arab Republic',
  'TW' : 'Taiwan',
  'TJ' : 'Tajikistan',
  'TZ' : 'Tanzania',
  'TG' : 'Togo',
  'TO' : 'Tonga',
  'TH' : 'Thailand',
  'TL' : 'Timor-Leste',
  'TK' : 'Tokelau',
  'TT' : 'Trinidad and Tobago',
  'TN' : 'Tunisia',
  'TR' : 'Turkey',
  'TM' : 'Turkmenistan',
  'TC' : 'Turks and Caicos Islands',
  'TV' : 'Tuvalu',
  'UG' : 'Uganda',
  'UA' : 'Ukraine',
  'AE' : 'United Arab Emirates',
  'GB' : 'United Kingdom',
  'UM' : 'United States Minor Outlying Islands',
  'UY' : 'Uruguay',
  'UZ' : 'Uzbekistan',
  'VU' : 'Vanuatu',
  'VA' : 'Vatican City State',
  'VE' : 'Venezuela',
  'VN' : 'Vietnam',
  'VG' : 'Virgin Islands, British',
  'VI' : 'Virgin Islands, U.S.',
  'WF' : 'Wallis and Futuna',
  'EH' : 'Western Sahara',
  'YE' : 'Yemen',
  'ZM' : 'Zambia',
  'ZW' : 'Zimbabwe'
};
