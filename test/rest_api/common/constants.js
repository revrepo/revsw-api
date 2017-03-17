
var ROUTE_IDS = require('./../../../config/routes/ids');

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
    ROUTES: ROUTE_IDS
  }
};

module.exports = Constants;
