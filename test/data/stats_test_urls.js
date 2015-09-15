module.exports = [{
    path: '/cached-object.js',
    count: 10,
    cache_miss: 1,
    cache_hit: 9,
    user_agent: 'test user agent 1',
    referer: 'http://www.referer1.com/path',
    http_hits: 20,
    https_hits: 20
  }, {
    path: '/cached-object2.js',
    count: 10,
    cache_miss: 1,
    cache_hit: 9,
    user_agent: 'test user agent 2',
    referer: 'http://www.referer2.com/path',
    http_hits: 20,
    https_hits: 20
  }, {
    path: '/not-cached-object2.js',
    count: 10,
    cache_miss: 10,
    cache_hit: 0,
    user_agent: 'test user agent 3',
    referer: 'http://www.referer3.com/path',
    http_hits: 20,
    https_hits: 20
  }
];
