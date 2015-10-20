var Joi = require('joi');

var dateFormatPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
var idFormatPattern = /^([0-9]|[a-f]){24}$/;

module.exports = {
  getSuccessResponse: function () {
    var successResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        message: Joi.string().required(),
      });
    return successResponseSchema;
  },
  getErrorResponse: function () {
    var errorResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        error: Joi.string().required(),
        message: Joi.string()
      });
    return errorResponseSchema;
  },
  getSuccessCreateResponse: function () {
    var successCreateResponseSchema = Joi.object()
      .keys({
        statusCode: Joi.number().integer().min(100).max(599).required(),
        object_id: Joi.string().regex(idFormatPattern).required(),
        message: Joi.string().required(),
      });
    return successCreateResponseSchema;
  },
  getAccount: function () {
    var accountSchema = Joi.object()
      .keys({
        companyName: Joi.string().required(),
        createdBy: Joi.string().required(),
        id: Joi.string().regex(idFormatPattern).required(),
        created_at: Joi.string().regex(dateFormatPattern).required(),
        updated_at: Joi.string().regex(dateFormatPattern).required()
      });
    return accountSchema;
  }
};
