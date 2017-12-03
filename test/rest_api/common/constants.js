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

var Constants = {
  API: {
    METHODS: {
      CREATE: 'create',
      READ_ALL: 'read-all',
      READ_ONE: 'read-one',
      UPDATE: 'update',
      DELETE: 'delete',
      DELETE_DATA: 'delete-by-data',
      PATCH: 'patch'
    },
    USERS: {
      ROLES: {
        REV_ADMIN: 'Rev Admin',
        RESELLER: 'Reseller',
        ADMIN: 'Admin',
        USER: 'Normal User'
      }
    },
    TEST_DATA_TYPES: {
      VALID: 'valid',
      INVALID: 'invalid',
      NIL: 'nil',
      EMPTY: 'empty',
      LONG: 'long',
      SHORT: 'short',
      BOGUS: 'bogus'
    },
    VENDORS: [
      'revapm',
      'nuubit',
      'hooli'      
    ]
  }
};

module.exports = Constants;
