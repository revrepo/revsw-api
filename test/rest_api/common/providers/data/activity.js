/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

// # Activity Data Provider object

// Requiring some used resources
var Utils = require('./../../../common/utils');

var longStr = 'LoremipsumdolorsitametconsecteturadipiscingelitPellente' +
  'squeposuereturpisvelmolestiefeugiatmassaorcilacinianunceumolestiearc' +
  'umetusatestProinsitametnequeefficiturelementumquamutcondimentumanteQ' +
  'uisquesedipsumegetsemtempuseleifendinvelligulaNuncmaximusgravidalibe' +
  'roquisultriciesnuncgravidaeuCrasaeratsitametfeliseuismodplaceratViva' +
  'musfermentumduisitametsemaccumsansedvariusurnaaliquetIntegernonnunca' +
  'cmassaconsequatimperdietidinterdummagnaCurabiturdolorexsollicitudinv' +
  'iverranislegetsodalestempormagnaDuissitameturnaeratMaurisaccumsanleo' +
  'sedquamlobortisvenenatisNullamimperdietetmagnasedaccumsanDuisposuere' +
  'posuererisusvitaevolutpatVestibulumbibendumnislhendreritnisipharetra' +
  'infaucibusnullarhoncusPellentesquepretiumuttellusidpellentesqueAenea' +
  'nanteaugueultricesuttortorquisconsequatsemperfelis';
var longNumber = 1234567890123456789012345678901234567890123456789012345;
var longNumberStr = '1234567890123456789012345678901234567890123456789012345';
var longId = '55a44ec7a6423355a44ec7a6423355a44ec7a6423355a44ec7a6423355a44';
var bogusString = '!@#$%^&*()_+';
var emptyString = '';
var invalidId = 'aaaaa00000aaaaa11111aaaa';
//var invalidTimestamp = '1456784291883';
var invalidTimestamp = '1010101010101';

// Defines some methods to generate valid and common domain-configs activity
// test data. With common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var ActivityDataProvider = {

  DataDrivenHelper: {

    userId: undefined,
    domainId: undefined,
    accountId: undefined,

    setQueryParams: function (data) {
      this.userId = data.userId;
      this.domainId = data.domainId;
      this.accountId = data.accountId;
    },

    getQueryParams: function () {
      var now = Date.now();
      var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
      var startTimestamp = now - (2 * hour); // 2 hours before
      var endTimestamp = now - (1 * hour); // 1 hour before
      return [
        {}, // No query params
        {user_id: this.userId},
        // {domain_id: this.domainId},
        {account_id: this.accountId},
        {from_timestamp: startTimestamp.toString()},
        {
          from_timestamp: startTimestamp.toString(),
          to_timestamp: endTimestamp.toString()
        }
      ];
    },

    getBogusQueryParams: function () {
      var now = Date.now();
      var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
      var startTimestamp = now - (2 * hour); // 2 hours before
      return [
        {user_id: bogusString},
        // {domain_id: bogusString},
        {account_id: bogusString},
        {from_timestamp: bogusString},
        {
          from_timestamp: startTimestamp.toString(),
          to_timestamp: bogusString
        }
      ];
    },

    getEmptyQueryParams: function () {
      var now = Date.now();
      var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
      var startTimestamp = now - (2 * hour); // 2 hours before
      return [
        {user_id: emptyString},
        // {domain_id: emptyString},
        {account_id: emptyString},
        {from_timestamp: emptyString},
        {
          from_timestamp: startTimestamp.toString(),
          to_timestamp: emptyString
        }
      ];
    },

    getLongQueryParams: function () {
      var now = Date.now();
      var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
      var startTimestamp = now - (2 * hour); // 2 hours before
      return [
        {user_id: longId},
        // {domain_id: longId},
        {account_id: longId},
        {from_timestamp: longNumberStr},
        {
          from_timestamp: startTimestamp.toString(),
          to_timestamp: longNumberStr
        }
      ];
    },

    getInvalidQueryParams: function () {
      return [
        {user_id: invalidId},
        // {domain_id: invalidId},
        {account_id: invalidId}
      ];
    },

    summary: {

      userId: undefined,
      domainId: undefined,
      accountId: undefined,

      setQueryParams: function (data) {
        this.userId = data.userId;
        this.domainId = data.domainId;
        this.accountId = data.accountId;
      },

      getQueryParams: function () {
        var now = Date.now();
        var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
        var startTimestamp = now - (2 * hour); // 2 hours before
        var endTimestamp = now - (1 * hour); // 1 hour before
        return [
          {}, // No query params
          {user_id: this.userId},
          // {domain_id: this.domainId},
          {account_id: this.accountId},
          {from_timestamp: startTimestamp.toString()},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: endTimestamp.toString()
          }
        ];
      },

      getBogusQueryParams: function () {
        var now = Date.now();
        var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
        var startTimestamp = now - (2 * hour); // 2 hours before
        return [
          {user_id: bogusString},
          // {domain_id: bogusString},
          {account_id: bogusString},
          {from_timestamp: bogusString},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: bogusString
          }
        ];
      },

      getEmptyQueryParams: function () {
        var now = Date.now();
        var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
        var startTimestamp = now - (2 * hour); // 2 hours before
        return [
          {user_id: emptyString},
          // {domain_id: emptyString},
          {account_id: emptyString},
          {from_timestamp: emptyString},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: emptyString
          }
        ];
      },

      getLongQueryParams: function () {
        var now = Date.now();
        var hour = 60 * 60 * 1000; // minutes * secs * milli-seconds
        var startTimestamp = now - (2 * hour); // 2 hours before
        return [
          {user_id: longId},
          // {domain_id: longId},
          {account_id: longId},
          {from_timestamp: longNumberStr},
          {
            from_timestamp: startTimestamp.toString(),
            to_timestamp: longNumberStr
          }
        ];
      },

      getInvalidQueryParams: function () {
        return [
          {user_id: invalidId},
          // {domain_id: invalidId},
          {account_id: invalidId}
        ];
      },
    }
  }
};

module.exports = ActivityDataProvider;
