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

var marked = require('marked'),
    hapi = require('hapi'),
    Boom = require('boom'),
    _ = require('lodash'),
    crypto = require('crypto'),
    fs = require('fs'),
    config = require('config'),
    jwt = require('jsonwebtoken');

var base64url = require('base64-url');
var base64 = require('js-base64').Base64;
var ursa = require('ursa');
var zlib = require('zlib');
var atob = require('atob');
var moment = require('moment');
var logger = require('revsw-logger')(config.log_config);
var Promise = require('bluebird');
require('datejs');

module.exports = {
  atob: atob,
  decodeSSOToken: function(token) {
    
    // This private key will be used to sign the SSO token
    var key = ursa.createPrivateKey(fs.readFileSync(config.get('azure_marketplace.sso_private_key')));
    // This public key will be used to encrypt the SSO token
    var pubkey = ursa.createPublicKey(fs.readFileSync(config.get('azure_marketplace.sso_public_key')));

    // URL-decode the token
    var tokenDecoded = this.webURLDecoding(token);
    if (tokenDecoded.includes('signedHash') && tokenDecoded.includes('encryptedData') && tokenDecoded.includes('secretToken')) {
      tokenDecoded = JSON.parse(tokenDecoded);
      // Now let's decompress the token
      logger.debug('tokenDecoded = ', tokenDecoded);
      var signedHash = tokenDecoded.signedHash;
      var encryptedData = tokenDecoded.encryptedData;
      var secretToken = tokenDecoded.secretToken;
      var secretTokenJson = JSON.parse(key.decrypt(secretToken, 'base64', 'utf8'));
      logger.debug('secretTokenJson = ', secretTokenJson);
      var sharedSecret = Buffer.from((secretTokenJson.symmetricKey), 'base64');
      var initializationVector = Buffer.from((secretTokenJson.iv), 'base64');

      logger.debug('sharedSecret = ', sharedSecret.toString());
      logger.debug('initializationVector = ', initializationVector.toString());

      // Performing symmetric decryption of the appToken
      var appToken = '';
      var decipher = crypto.Decipheriv('aes-256-cbc', sharedSecret, initializationVector);
      appToken += decipher.update(encryptedData, 'base64', 'utf8');
      appToken += decipher.final('utf8');

      logger.debug('appToken = ', appToken);

      // TODO add signature verification?
      return JSON.parse(appToken);
    } else {
      return 'Bad token format';
    }
  },

  decodeSSOResourceId: function(resourceId) {
    // Unzip the resource ID
    return new Promise(function (resolve, reject) {
      var resourceDecoded = Buffer.from(resourceId, 'base64');
      zlib.gunzip(resourceDecoded, function (err, data) {
        if (err !== null) {
          reject(err);
        } else {
          // removing quotes from start and end, zlib why u add quotes?!
          resolve(data.toString().substr(1,data.toString().length -2)); 
        }      
      });
    });
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

  isUserRevAdmin: function(request) {
    return request.auth.credentials.role === 'revadmin';
  },
  isUserReseller: function(request) {
    return request.auth.credentials.role === 'reseller';
  },
  /**
   * @name isAPIKey
   * @description method checking type of credentials from request
   */
  isAPIKey: function(request) {
    return request.auth.credentials.user_type === 'apikey';
  },
  // Detect access API key to Account
  isHasAPIkeyAccessToAccount: function(credentials, accountId){
    return  ((credentials.account_id === accountId) || (!!credentials.managed_account_ids && credentials.managed_account_ids.indexOf(accountId)!==-1));
  },
  /**
   * Generate random token
   *
   * @return {string}
   */
  generateToken : function(len) {
    var buf = crypto.randomBytes(len || 20);
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
    var error = Boom.badRequest(err);
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
   * @name convertDateToTimestamp
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
  /**
   * @name roundTimestamps
   * @description method return new object with information about timestamps round to hour range
   */
  roundTimestamps : function(options, rangMin){
    var updatedProperties = {};
    if(!!rangMin) {
      rangMin = 5;
    }
    if(!!options.from_timestamp) {
      var numberFromTimestamp = parseInt(options.from_timestamp);
      if(!isNaN(numberFromTimestamp)){
        var diffFrom_ = moment(numberFromTimestamp)
          .diff(moment(numberFromTimestamp).startOf('hours'), 'minutes');
        updatedProperties.from_timestamp = moment(numberFromTimestamp)
          .startOf('minutes')
          .subtract(diffFrom_ % rangMin, 'minutes').valueOf();
      }
    }
    if(!!options.to_timestamp) {
      var numberToTimestamp = parseInt(options.to_timestamp);
      if(!isNaN(numberToTimestamp)) {
        var diffTo_ = moment(parseInt(options.from_timestamp))
          .diff(moment(parseInt(options.from_timestamp)).startOf('hours'), 'minutes');
        updatedProperties.to_timestamp = moment(parseInt(options.to_timestamp))
          .startOf('minutes')
          .subtract(diffTo_ % rangMin, 'minutes').valueOf();
      }
    }
    return updatedProperties;
  },

  generateCreatedByField: function(request){
    return request.auth.credentials.email || ('API Key ' + request.auth.credentials.id);
  },
  /**
   * @name getAccountID
   * @description method for extract information about account(s) ID from a request credentials
   *
   * @param {{Object}} request
   * @param {{Boolean}} isMainAccountId - if equal 'true' then will be return only main account
   * @return {{String|Array}}
   */
  getAccountID: function(request, isMainAccountIdOnly){
    var user = request.auth.credentials;
    var permissions = user.permissions;
    var returnAccounts = [];

    if (permissions) {
      if (user.child_accounts && user.child_accounts.length > 0 && user.role === 'reseller') {
        returnAccounts = returnAccounts.concat(user.child_accounts);
      }
      returnAccounts.push(user.account_id);
      if (permissions.accounts.list && permissions.accounts.list.length > 0) {
        returnAccounts = returnAccounts.concat(permissions.accounts.list);
      }
      // new system
      return returnAccounts;
    } else {
      switch(request.auth.credentials.user_type){
        case 'user':
          if(isMainAccountIdOnly === true){
            if(!_.isArray(request.auth.credentials.companyId)){
              var ids_ = request.auth.credentials.companyId.split();
              return ids_[0];
            }
            return request.auth.credentials.account_id;
          }
          return request.auth.credentials.companyId;
        case 'apikey':
          // NOTE: API Key has access to his main account and to accounts into 'managed_account_ids'
          var accountID = request.auth.credentials.account_id;
          var managedAccountIds = request.auth.credentials.managed_account_ids || [];
          if(isMainAccountIdOnly === true){
            return accountID;
          }
          managedAccountIds.unshift(accountID);
          return _.uniq(managedAccountIds);
        default:
          // NOTE: the critical situation
          return new Error('No-existing user_type then try to call method getAccountID');
      }
    }
  },

  generateJWT: function(user) {
    return jwt.sign({
      user_id: user.user_id,
      password: user.password
    }, config.get('jwt_private_key'), {
      expiresIn: config.get('jwt_token_lifetime_minutes') * 60
    });
  },

  /**
   * @name convertFirstCharacterToUpperCase
   * @description method make a first letter of a string uppercase
   */
  convertFirstCharacterToUpperCase: function(text) {
    return text.substr(0, 1).toUpperCase() + text.substr(1);
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
