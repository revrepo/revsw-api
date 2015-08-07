

module.exports = {

  service: {
    url: '0.0.0.0',
    http_port: 7000,
    https_port: 8000,
  },
  master_password: '8cdea34a9c582e10940da5beb29b4597',
  is_https: true,
//  version_file: './config/version.txt',
  key_path: './config/ssl_certs/server.key',
  cert_path: './config/ssl_certs/server.crt',
  portal_url: 'https://testsjc20-portal01.revsw.net:3000',
  use_x_forwarded_for: true,
  default_cname_domain: 'revdn.net',
  portal_mongo: {
    connect_string: 'mongodb://TESTSJC20-CMDB01.REVSW.NET:27017/revportal?replicaSet=CMDB-rs0'
  },
  purge_mongo: {
    connect_string: 'mongodb://TESTSJC20-CMDB01.REVSW.NET:27017/purgejobs?replicaSet=CMDB-rs0'
  },
  logging: {
    syslog_level: 'debug', // allowed levels debug, info, notice, warning, error, crit, alert, emerg
    debug_log_file_path: './log'
  }
};
