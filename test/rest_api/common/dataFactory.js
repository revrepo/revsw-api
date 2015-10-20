module.exports = {
  generateAccount: function (prefix) {
    return {
      companyName: (prefix ? prefix + '_' : '' ) + 'API_TEST_COMPANY_' +
      (new Date()).getTime()
    };
  }
};
