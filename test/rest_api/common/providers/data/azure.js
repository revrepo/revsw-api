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



// # Azure Data Provider object
//
// Defines some methods to generate valid and common Azure test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var AzureDataProvider = {

  generateOne: function (data) {
    data = data || {};
    return {
      subscription_id: data.subscription_id || '2',	
      provider: data.provider || 'RevAPM.MobileCDN',
      resource_group_name: data.resource_group_name || 'rg1',
      resource_name: data.resource_name || this.generateResourceName()
    };
  },
  generateTwo: function () {
    return {
      subscription_id: 'ab'
    };
  },
  generate: function () {
    return {
      state: 'Registered'
    };
  },
  generateLocation: function () {
    return {
      location: 'west us' 
    };
  },
   generateResource: function () {
    return {
      resource_name: 'r2' 
    };
  },
  generateCompleteOne: function () {
    var complete = this.generateOne();
    complete.state = this.generate().state;
    complete.location = this.generateLocation().location;

    return complete;
  },
  generateResourceName: function () {
    return 'azureresource-' + Date.now();
  }
};

module.exports = AzureDataProvider;
