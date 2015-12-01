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

// # Domain Configs Data Provider object
//
// Defines some methods to generate valid and common domain-configs test data.
// With common we mean it oes not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var DomainConfigsDataProvider = {

  domainStr: 'API-TEST',

  /**
   * ### DomainConfigsDataProvider.generateOne()
   *
   * Generates valida data that represents an domain-config which the
   * domain-configs REST API end points accept.
   *
   * @param {String} accountId, which will be used in the domain config data.
   *
   * @returns {Object} account info with the following schema
   *
   *     {
   *         domain_name: string
   *         account_id: string
   *         origin_host_header: string
   *         origin_server: string
   *         origin_server_location_id: string
   *     }
   */
  generateOne: function (accountId) {
    return  {
      'domain_name': this.domainStr + '-name-' + Date.now() + '.revsw.net',
      'account_id': accountId,
      'origin_host_header': this.domainStr + '-config.revsw.net',
      'origin_server': this.domainStr + '-website01.revsw.net',
      'origin_server_location_id': '55a56fa6476c10c329a90741',
      'tolerance': 4000
    };
  }

};

module.exports = DomainConfigsDataProvider;