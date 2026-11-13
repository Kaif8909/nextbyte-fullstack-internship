// Log only fixed labels, explicitly allowlisted codes and booleans. Never log
// an exception object, message, stack, request URL, payload, or environment value.
const categories = {
  DATABASE_URL_MISSING: 'configuration', DATABASE_URL_INVALID: 'configuration',
  DATABASE_CA_INVALID: 'certificate_configuration', DATABASE_CA_FILE_UNREADABLE: 'certificate_configuration',
  ORGANIZER_CONFIG_INVALID: 'authentication_configuration',
  ERR_INVALID_URL: 'configuration', ERR_MODULE_NOT_FOUND: 'dependency_import', MODULE_NOT_FOUND: 'dependency_import',
  ERR_PACKAGE_PATH_NOT_EXPORTED: 'dependency_import', ERR_UNSUPPORTED_DIR_IMPORT: 'dependency_import',
  ERR_REQUIRE_ESM: 'dependency_import', ERR_UNKNOWN_FILE_EXTENSION: 'dependency_import',
  ERR_INVALID_ARG_TYPE: 'runtime_configuration', ERR_INVALID_ARG_VALUE: 'runtime_configuration',
  ERR_INVALID_FILE_URL_HOST: 'runtime_configuration', ERR_INVALID_FILE_URL_PATH: 'runtime_configuration',
  ENOTFOUND: 'dns', EAI_AGAIN: 'dns', ECONNREFUSED: 'network', ECONNRESET: 'network', ETIMEDOUT: 'network',
  SELF_SIGNED_CERT_IN_CHAIN: 'tls', DEPTH_ZERO_SELF_SIGNED_CERT: 'tls',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'tls', UNABLE_TO_GET_ISSUER_CERT_LOCALLY: 'tls',
  ERR_TLS_CERT_ALTNAME_INVALID: 'tls', CERT_HAS_EXPIRED: 'tls', CERT_NOT_YET_VALID: 'tls',
  ERR_OSSL_PEM_NO_START_LINE: 'certificate_configuration', ERR_OSSL_ASN1_TOO_LONG: 'certificate_configuration',
  '28P01': 'database_authentication', '28000': 'database_authentication',
  '3D000': 'database_configuration', '42501': 'database_permissions', '53300': 'database_capacity'
};
const stages = new Set(['request_routing', 'open_store', 'create_handler', 'database_connect', 'request_handler']);

export function initializationError(code) {
  const error = new Error('Initialization failed.');
  error.code = Object.hasOwn(categories, code) ? code : 'INITIALIZATION_FAILED';
  return error;
}

export function logInitializationFailure(error, stage, env = process.env) {
  const code = typeof error?.code === 'string' && Object.hasOwn(categories, error.code)
    ? error.code : 'INITIALIZATION_FAILED';
  console.error(JSON.stringify({
    event: 'eventease_initialization_failed',
    stage: stages.has(stage) ? stage : 'unknown',
    category: categories[code] || 'unknown', code,
    errorType: ['Error', 'TypeError', 'SyntaxError', 'RangeError'].includes(error?.name) ? error.name : 'unknown',
    configuration: {
      DATABASE_URL: Boolean(env.DATABASE_URL), DATABASE_CA_CERT: Boolean(env.DATABASE_CA_CERT),
      BOOKING_TOKEN_SECRET: Boolean(env.BOOKING_TOKEN_SECRET),
      DATABASE_CA_CERT_FILE: Boolean(env.DATABASE_CA_CERT_FILE),
      ORGANIZER_CREDENTIALS: Boolean(env.ORGANIZER_CREDENTIALS)
    }
  }));
}
