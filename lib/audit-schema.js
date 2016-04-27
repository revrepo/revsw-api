
var Joi = require('joi');

exports.options = Joi.object().keys({
  ip_address       : Joi.string(),
  datetime         : Joi.number().integer(),
  user_type        : Joi.any().valid('user', 'apikey', 'system').required(),
  user_name        : Joi.string(),
  user_id          : Joi.string(),
  account_id       : Joi.string(),
  activity_type    : Joi.any().valid('login', 'add', 'modify', 'delete', 'publish', 'purge').required(),
  activity_target  : Joi.any().valid('user', 'account', 'domain', 'purge', 'object', 'apikey', 'team', 'app', 'sslcert').required(),
  target_name      : Joi.string(),
  target_id        : Joi.string(),
  operation_status : Joi.any().valid('success', 'failure').required(),
  target_object    : Joi.object()
});
