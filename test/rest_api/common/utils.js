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
  },

  /**
   * Object.assign polyfill, rudimentary, no checks
   *
   * @params {Object, Object[, Object, ...]} - Objects to merge, first one is a target
   * @returns {Object} - target
   */
  assign: ( Object.assign ? Object.assign : function (target) {
    var dst = Object(target);
    for (var i = 1, len = arguments.length; i < len; ++i) {
      var src = arguments[i];
      if (src !== undefined) {
        for (var key in src) {
          if (src.hasOwnProperty(key)) {
            dst[key] = src[key];
          }
        }
      }
    }
    return dst;
  }),

  /**
   * combine queries objects
   *
   * gets arrays with possible @param values, like
   *   [{a:1},{a:2}], [{b:'one'}, {b:'two'}], [{c:4,d:5},{c:7,d:9}]
   * @returns all param values combinations
   *   [{ a: 1, b: 'one', c: 4, d: 5 },
   *    { a: 2, b: 'one', c: 4, d: 5 },
   *    { a: 1, b: 'two', c: 4, d: 5 },
   *    { a: 2, b: 'two', c: 4, d: 5 },
   *    { a: 1, b: 'one', c: 7, d: 9 },
   *    { a: 2, b: 'one', c: 7, d: 9 },
   *    { a: 1, b: 'two', c: 7, d: 9 },
   *    { a: 2, b: 'two', c: 7, d: 9 }]
   */
  combineQueries: function () {
    var dst = [],
      dst_len = 1,
      alen = arguments.length, i, ai;
    for (i = 0; i < alen; ++i) {
      dst_len *= arguments[i].length;
    }
    for (i = 0; i < dst_len; ++i) {
      var item = {},
        idx = i;
      for (ai = 0; ai < alen; ++ai) {
        this.assign( item, arguments[ai][idx % arguments[ai].length] );
        idx = Math.floor( idx / arguments[ai].length );
      }
      dst.push( item );
    }

    return dst;
  },

  /**
   * guess
   *
   * @param {Array} - array to shuffle
   * @returns {Array} - input, shuffled
   */
  shuffleArray: function ( arr ) {
    var i = arr.length;
    while ( i-- ) {
      arr.push( arr.splice( Math.floor( Math.random() * ( i + 1 ) ), 1 )[0] );
    };

    return arr;
  }
};

module.exports = Utils;