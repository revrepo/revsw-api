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

// # Utils object
//
// Defines some common methods to use in any test script.
var Utils = {

  /**
   * ### Utils.getJsonAsKeyValueString()
   *
   * Returns a JSON object as string with following format:
   *
   *    key1=value1, key2=value2, key3=value3
   *
   * @returns {String}
   */
  getJsonAsKeyValueString: function (jsonObject) {
    return JSON
      .stringify(jsonObject)
      .replace(/{|}/g, '')
      .replace(/":"/g, '=')
      .replace(/","/g, ', ')
      .replace(/"/g, '');
  },

  /**
   * ### Utils.getJsonKeysAsString()
   *
   * Returns keys from a JSON object as string with following format:
   *
   *    key1, key2, key3
   *
   * @returns {String}
   */
  getJsonKeysAsString: function (jsonObject) {
    return Object.keys(jsonObject).join(', ');
  },

  /**
   * Removes JSON from array if it has the provided key
   *
   * @param jsonArray
   * @param key
   */
  removeJsonFromArray: function (jsonArray, key) {
    jsonArray.forEach(function (json, index) {
      if (json[key]) { // if JSON has provided key
        jsonArray.splice(index, 1);
      }
    });
  },

  /**
   * Searches JSON object in array that matches given properties and its values
   *
   * @param {Array} jsonArray
   * @param {Object} matchProperties
   * @returns {Object} json found
   */
  searchJsonInArray: function (jsonArray, matchProperties) {
    var jsonFound, item, itemCounter, key;
    var matchPropKeys = Object.keys(matchProperties);
    var totalKeys = matchPropKeys.length;
    for (var i = 0, arrayLength = jsonArray.length; i < arrayLength; i++) {
      item = jsonArray[i];
      itemCounter = 0;
      for (var j = 0; j < totalKeys; j++) {
        key = matchPropKeys[j];
        if (item[key] === matchProperties[key]) {
          itemCounter++;
          continue;
        }
        break;
      }
      if (itemCounter === matchPropKeys.length) {
        jsonFound = item;
        break;
      }
    }
    return jsonFound;
  },

  /**
   * ### PurgeDataProvider.setValueByPath()
   *
   * @param {Object} obj (Domain Config), object in which value is going to
   * be set
   * @param {String} pathString, that represents the concatenation of keys and
   * the last key is the one that is going to change
   * @param {Object} value, any value that the property accepts
   */
  setValueByPath: function (obj, pathString, value) {
    var prop = obj;
    var path = pathString.split('.');
    for (var i = 0; i < path.length - 1; i++) {
      var key = path[i] === '0' ? 0 : path[i];
      prop = prop[key];
    }
    prop[path[i]] = value;
  },

  /**
   * ### PurgeDataProvider.getValueByPath()
   *
   * @param {Object} obj (Domain Config), object in which value is going to
   * be set
   * @param {String} pathString that represents the concatenation of keys and
   * the last key is the one that for which the value is going to be get
   * @returns {Object|Undefined} the value that the key has in the specified
   * object, undefined otherwise
   */
  getValueByPath: function (obj, pathString) {
    var prop = JSON.parse(JSON.stringify(obj));
    var path = pathString.split('.');
    for (var i = 0; i < path.length - 1; i++) {
      prop = prop[path[i]];
      if (prop === undefined) {
        return undefined;
      }
    }
    return prop[path[i]];
  },

  removeValueByPath: function (obj, pathString) {
    var prop = obj;
    var path = pathString.split('.');
    for (var i = 0; i < path.length - 1; i++) {
      prop = prop[path[i]];
      if (prop === undefined) {
        return;
      }
    }
    delete prop[path[i]];
  }
};

module.exports = Utils;