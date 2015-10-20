
module.exports = {
  'api': {
    'host': {
      protocol: 'https',
      name: '0.0.0.0',
      port: 8000
    },
    'version': 'v1',
    'resources': {
      'accounts': 'accounts'
    },
    request: {
      'maxTimeout': 10000
    },
    'users': {
      'revAdmin': {
        name: 'qa_user_with_rev-admin_perm@revsw.com',
        password: 'password1'
      },
      'reseller': {
        name: 'api_qa_user_with_reseller_perm@revsw.com',
        password: 'password1'
      },
      'secondReseller': {
        name: 'api_qa_user_2_with_reseller_perm@revsw.com',
        password: 'password1'
      },
      'admin': {
        name: 'api_qa_user_with_admin_perm@revsw.com',
        password: 'password1'
      },
      'user': {
        name: 'qa_user_with_user_perm@revsw.com',
        password: 'password1'
      }
    }
  }
};
