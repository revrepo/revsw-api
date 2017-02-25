module.exports = {
  "API_KEYS": {
    "BASE_PATH": "apiKeys",
    "GET": {
      "ALL": "GET::API_KEYS::ALL",
      "ONE": "GET::API_KEYS::{ID}",
      "MYSELF": "GET::API_KEYS::MYSELF",
    },
    "POST": {
      "NEW": "POST::API_KEYS::NEW",
      "ACTIVATE": "POST::API_KEYS::ACTIVATE",
      "DEACTIVATE": "POST::API_KEYS::DEACTIVATE"
    },
    "PUT": {
      "ONE": "PUT::API_KEYS::{ID}"
    },
    "DELETE": {
      "ONE": "DELETE::API_KEYS::{ID}"
    }
  }
}
