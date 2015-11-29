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
    portal_request = require('supertest');

require('datejs');

module.exports = {

  //
  // Check that user (in HAPI request object) is allowed to access a domain specified in domainObject argument
  //
  checkUserAccessPermissionToDomain: function(request, domainObject) {
    // Allow full access to Revadmin role
    if (request.auth.credentials.role === 'revadmin') {
      return true;
    // Allow access to Admin and Reseller who manage the company
    } else if ((request.auth.credentials.role === 'reseller' || request.auth.credentials.role === 'admin') &&
      (request.auth.credentials.companyId.indexOf(domainObject.account_id) !== -1)) {
      return true;
    // For user role allow the access only if the user belongs to the company and has permissions to manage the specific domain
    } else if ((request.auth.credentials.role === 'user' && request.auth.credentials.companyId.indexOf(domainObject.proxy_config.account_id) !== -1 &&
      request.auth.credentials.domain.indexOf(domainObject.domain_name) !== -1)) {
      return true;  // allow access
    } else {
      return false;  // deny access
    }
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

  // Login to the portal and return error status and token
  loginToPortal : function (email, password, role, callback) {
    var userUserJson = {
      email           : email,
      password_hashed : password,
      password        : password,
      logFrm          : 'user',
      user_type       : role
    };

//    console.log('userUserJson = ', userUserJson);
    portal_request(config.get('portal_url'))
      .post('/user/login')
      .send(userUserJson)
      .end(function (err, res) {
        if (err || !res || res.statusCode !== 200) {
          callback(err, null);
        }
//        console.log(res.text);
        var response_json = JSON.parse(res.text);
        var userToken = response_json.response.token;
        callback(null, userToken);
      });
  },

  /**
   * creates indices list from the time span, like "logstash-2015.11.14,logstash-2015.11.15,logstash-2015.11.16,logstash-2015.11.17"
   * used in functions doing ElasticSearch calls
   *
   * @param {Number} Unix timestamp
   * @param {Number} Unix timestamp
   */
  buildIndexList : function (start_time, end_time) {
    var d_start = new Date(start_time),
      day_ms = 24 * 3600000,
      list = 'logstash-' + d_start.getUTCFullYear() + '.' + ('0' + (d_start.getUTCMonth() + 1)).slice(-2) + '.' + ('0' + d_start.getUTCDate()).slice(-2);

    // end_time = Math.floor( end_time / day_ms + 1 ) * day_ms;
    end_time = ( Math.floor( ( end_time - 1 ) / day_ms ) + 1 ) * day_ms;
    for ( var d = start_time + day_ms; d < end_time; d += day_ms ) {
      var d_curr = new Date( d );
      list += ',logstash-' + d_curr.getUTCFullYear() + '.' + ('0' + (d_curr.getUTCMonth() + 1)).slice(-2) + '.' + ('0' + d_curr.getUTCDate()).slice(-2);
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
