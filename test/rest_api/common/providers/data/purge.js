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

// # Purge Data Provider object
//
// Defines some methods to generate valid and common purge test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var PurgeDataProvider = {

  prefix: 'api-test',

  /**
   * ### PurgeDataProvider.generateOne()
   *
   * Generates valid data that represents an purge which the purge
   * REST API end points accepts.
   *
   * @param {String} domainName, which will be used in the purge data.
   *
   * @returns {Object} account info with the following schema
   *
   *     {
   *       domainName: string
   *       purges: [
   *         {
   *           url: {
   *             is_wildcard: Boolean,
   *             expression: String
   *           }
   *         }
   *       ]
   *     }
   */
  generateOne: function (domainName) {
    return {
      domainName: domainName,
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js'
        }
      }]
    };
  },

  DataDrivenHelper: {

    /**
     * ### PurgeDataProvider.DataDrivenHelper.generateEmptyData()
     *
     * Generates empty data for the key and based on the schema-definition
     * provided.
     *
     * @param {String} propertyPath, concatenation of keys
     * @param {String} schemaDef, schema defined by Joi
     * @returns {
     *     spec: string,
     *     propertyPath: *,
     *     testValue: {object|undefined}
     * }
     */
    generateEmptyData: function (propertyPath, schemaDef) {
      var data = {
        spec: 'should return bad request when trying to create purge with ' +
        'empty `' + propertyPath + '` property value',
        propertyPath: propertyPath,
        testValue: undefined
      };
      if (/Joi\.string\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = '';
      }
      else if (/Joi\.array\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = undefined;
      }
      else if (/Joi\.boolean\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = undefined;
      }
      else if (/Joi\.object\(\)/.test(schemaDef)) {
        data.testValue = undefined;
      }
      else {
        //console.log('ALERT! not considered:', schemaDef);
        data.testValue = undefined;
      }
      return data;
    },

    /**
     * ### PurgeDataProvider.DataDrivenHelper.generateInvalidData()
     *
     * Generates invalid data for the key and based on the schema-definition
     * provided.
     *
     * @param {String} propertyPath, concatenation of keys
     * @param {String} schemaDef, schema defined by Joi
     * @returns {
     *     spec: string,
     *     propertyPath: *,
     *     testValue: {object|undefined}
     * }
     */
    generateInvalidData: function (propertyPath, schemaDef) {
      var data = {
        spec: 'should return bad request when trying to create purge with ' +
        'invalid `' + propertyPath + '` property value',
        propertyPath: propertyPath,
        testValue: undefined
      };
      if (/Joi\.string\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = 123456789;
      }
      else if (/Joi\.array\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = {};
      }
      else if (/Joi\.boolean\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = 123;
      }
      else if (/Joi\.object\(\)/.test(schemaDef)) {
        data.testValue = [];
      }
      else {
        //console.log('ALERT! not considered:', schemaDef);
        data.testValue = undefined;
      }
      return data;
    },

    /**
     * ### PurgeDataProvider.DataDrivenHelper.generateBogusData()
     *
     * Generates invalid data for the key and based on the schema-definition
     * provided.
     *
     * @param {String} propertyPath, concatenation of keys
     * @param {String} schemaDef, schema defined by Joi
     * @returns {
     *     spec: string,
     *     propertyPath: *,
     *     testValue: {object|undefined}
     * }
     */
    generateBogusData: function (propertyPath, schemaDef) {
      var bogusData = '!@#$%^&*()';
      var data = {
        spec: 'should return bad request when trying to create purge with ' +
        'bogus `' + propertyPath + '` property value',
        propertyPath: propertyPath,
        testValue: undefined
      };
      if (/Joi\.string\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = bogusData;
        if (propertyPath === 'purges.0.url.expression') {
          data.skipReason = '"expression" field accepts regular expressions: we need to find a proper way ' +
            'to validate this field type';
        }
      }
      else if (/Joi\.array\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = bogusData;
      }
      else if (/Joi\.boolean\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = bogusData;
      }
      else if (/Joi\.object\(\)/.test(schemaDef)) {
        data.testValue = bogusData;
      }
      else {
        //console.log('ALERT! not considered:', schemaDef);
        data.testValue = undefined;
      }
      return data;
    },

    /**
     * ### PurgeDataProvider.DataDrivenHelper.generateWithoutRequiredData()
     *
     * Generates data without required data for the key and based on the
     * schema-definition provided.
     *
     * @param {String} propertyPath, concatenation of keys
     * @param {String} schemaDef, schema defined by Joi
     * @returns {
     *     spec: string,
     *     propertyPath: *,
     *     isRequired: {Boolean}
     * }
     */
    generateWithoutRequiredData: function (propertyPath, schemaDef) {
      var data = {
        spec: 'should return bad request when trying to create purge without ' +
        'required `' + propertyPath + '` property value',
        propertyPath: propertyPath,
        isRequired: undefined
      };
      if (/Joi\.string\(\)\.required\(\)/.test(schemaDef)) {
        data.isRequired = true;
      }
      else if (/Joi\.array\(\)\.required\(\)/.test(schemaDef)) {
        data.isRequired = true;
      }
      else if (/Joi\.boolean\(\)\.required\(\)/.test(schemaDef)) {
        data.isRequired = true;
      }
      else if (/Joi\.object\(\)/.test(schemaDef)) {
        data.isRequired = false;
      }
      else {
        //console.log('ALERT! not considered:', schemaDef);
        data.testValue = undefined;
      }
      return data;
    },

    /**
     * ### PurgeDataProvider.generateLongData()
     *
     * Generates long data for the key and based on the schema-definition
     * provided.
     *
     * @param {String} propertyPath, concatenation of keys
     * @param {String} schemaDef, schema defined by Joi
     * @returns {
     *     spec: string,
     *     propertyPath: *,
     *     testValue: {object|undefined}
     * }
     */
    generateLongData: function (propertyPath, schemaDef) {
      var longObjectId = 'abcdef01234567890123456789';
      var longNumber = 98765432109876543210987654321098765432109876543210;
      var longText = 'LoremipsumdolorsitametconsecteturadipiscingelitPellente' +
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
      var data = {
        spec: 'should return bad request when trying to update domain ' +
        'with long `' + propertyPath + '` property value',
        propertyPath: propertyPath,
        testValue: undefined
      };
      if (/Joi\.string\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = longText;
      }
      else if (/Joi\.array\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = undefined;
      }
      else if (/Joi\.boolean\(\)\.required\(\)/.test(schemaDef)) {
        data.testValue = undefined;
      }
      else if (/Joi\.object\(\)/.test(schemaDef)) {
        data.testValue = undefined;
      }
      else {
        //console.log('ALERT! not considered:', schemaDef);
        data.testValue = undefined;
      }
      return data;
    }
  }
};

module.exports = PurgeDataProvider;
