
import { expect } from 'chai';
import dotenv from 'dotenv';
import { stringifier } from '@dcx-protocol/common';
import { issuerConfig } from '../src/index.js';
dotenv.config({ path: '.env.test' });

describe('IssuerConfig class', () => {
  describe('properties defined by process.env vars', () => {
    it('should contain property ISSUER_LAST_RECORD_ID as a string', () => {
      const ISSUER_LAST_RECORD_ID = issuerConfig.lastRecordIdFile;
      expect(ISSUER_LAST_RECORD_ID).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_LAST_RECORD_ID).to.be.an('string');
      console.log(`      ✔ ISSUER_LAST_RECORD_ID=${ISSUER_LAST_RECORD_ID}`);
    });

    it('should contain property ISSUER_CURSOR as a string', () => {
      const ISSUER_CURSOR = issuerConfig.cursorFile;
      expect(ISSUER_CURSOR).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_CURSOR).to.be.an('string');
      console.log(`      ✔ ISSUER_CURSOR=${ISSUER_CURSOR}`);
    });

    it('should contain property ISSUER_PORT as a string equal to 4000', () => {
      const ISSUER_PORT = issuerConfig.port;
      expect(ISSUER_PORT).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_PORT).to.be.an('string');
      expect(ISSUER_PORT).equals('4000');
      console.log(`      ✔ ISSUER_PORT=${ISSUER_PORT}`);
    });

    it('should contain property ISSUER_SERVICE_NAME as a string equal to "dcx"', () => {
      const ISSUER_SERVICE_NAME = issuerConfig.serviceName;
      expect(ISSUER_SERVICE_NAME).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_SERVICE_NAME).to.be.an('string');
      expect(ISSUER_SERVICE_NAME).equals('DCX Issuer');
      console.log(`      ✔ ISSUER_SERVICE_NAME=${ISSUER_SERVICE_NAME}`);
    });

    it('should contain property ISSUER_SERVICE_ID as a string equal to "dcx"', () => {
      const ISSUER_SERVICE_ID = issuerConfig.serviceId;
      expect(ISSUER_SERVICE_ID).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_SERVICE_ID).to.be.an('string');
      expect(ISSUER_SERVICE_ID).equals('dcx-issuer');
      console.log(`      ✔ ISSUER_SERVICE_ID=${ISSUER_SERVICE_ID}`);
    });

    it('should contain property ISSUER_DWN_ENDPOINTS as an array of length 2', () => {
      const ISSUER_DWN_ENDPOINTS = issuerConfig.dwnEndpoints;
      expect(ISSUER_DWN_ENDPOINTS).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_DWN_ENDPOINTS).to.be.an('array');
      expect(ISSUER_DWN_ENDPOINTS).to.have.lengthOf(2);
      console.log(`      ✔ ISSUER_DWN_ENDPOINTS=`, ISSUER_DWN_ENDPOINTS);
    });

    it('should contain property ISSUER_GATEWAY_URIS as an array of length 2', () => {
      const ISSUER_GATEWAY_URIS = issuerConfig.gatewayUris;
      expect(ISSUER_GATEWAY_URIS).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_GATEWAY_URIS).to.be.an('array');
      expect(ISSUER_GATEWAY_URIS).to.have.lengthOf(2);
      console.log(`      ✔ ISSUER_GATEWAY_URIS=`, ISSUER_GATEWAY_URIS);
    });

    it('should contain property ISSUER_WEB5_AGENT_DATA_PATH as a string equal to "DATA/DCX/ISSUER/AGENT"', () => {
      const ISSUER_WEB5_AGENT_DATA_PATH = issuerConfig.agentDataPath;
      expect(ISSUER_WEB5_AGENT_DATA_PATH).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_WEB5_AGENT_DATA_PATH).to.be.an('array');
      expect(ISSUER_WEB5_AGENT_DATA_PATH).to.have.lengthOf(1);
      console.log(`      ✔ ISSUER_WEB5_AGENT_DATA_PATH=`, ISSUER_WEB5_AGENT_DATA_PATH);
    });

    it('should contain property ISSUER_WEB5_PASSWORD as a string', () => {
      const ISSUER_WEB5_PASSWORD = issuerConfig.web5Password;
      expect(ISSUER_WEB5_PASSWORD).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_WEB5_PASSWORD).to.be.an('string');
      console.log(`      ✔ ISSUER_WEB5_PASSWORD=${ISSUER_WEB5_PASSWORD}`);
    });

    it('should contain ISSUER_WEB5_RECOVERY_PHRASE as a string', () => {
      const ISSUER_WEB5_RECOVERY_PHRASE = issuerConfig.web5RecoveryPhrase;
      expect(ISSUER_WEB5_RECOVERY_PHRASE).to.not.be.null.and.not.be.undefined;
      expect(ISSUER_WEB5_RECOVERY_PHRASE).to.be.an('string');
      console.log(`      ✔ ISSUER_WEB5_RECOVERY_PHRASE=${ISSUER_WEB5_RECOVERY_PHRASE}`);
    });
  });

  describe('extends Config class', () => {
    it('should contain property DCX_ENV inherited from Config class as a string matching "development" or "test"', () => {
      const DCX_ENV = issuerConfig.DCX_ENV;
      expect(DCX_ENV).to.not.be.null.and.not.be.undefined;
      expect(DCX_ENV).to.be.a('string');
      expect(DCX_ENV).to.be.match(/(development|test)/);
      console.log(`      ✔ DCX_ENV=${DCX_ENV}`);
    });

    it('should contain property DCX_ENDPOINTS inherited from Config class as an object containing 3 key value pairs', () => {
      const DCX_ENDPOINTS = issuerConfig.DCX_ENDPOINTS;
      expect(DCX_ENDPOINTS).to.not.be.null.and.not.be.undefined;
      expect(DCX_ENDPOINTS).to.be.an('object');
      expect(Object.entries(DCX_ENDPOINTS)).have.lengthOf.gte(3);
      console.log(`      ✔ DCX_ENDPOINTS=`, stringifier(DCX_ENDPOINTS));
    });

    it('should contain property DCX_INPUT_ISSUERS inherited from Config class as an array of length 1', () => {
      const DCX_INPUT_ISSUERS = issuerConfig.DCX_INPUT_ISSUERS;
      expect(DCX_INPUT_ISSUERS).to.not.be.null.and.not.be.undefined;
      expect(DCX_INPUT_ISSUERS).to.be.an('array');
      expect(DCX_INPUT_ISSUERS).to.have.lengthOf.gte(1);
      console.log(`      ✔ DCX_INPUT_ISSUERS=`, stringifier(DCX_INPUT_ISSUERS));
    });

    it('should contain property DCX_HANDSHAKE_MANIFEST inherited from Config class as an object of type ServerManifest', () => {
      const DCX_HANDSHAKE_MANIFEST = issuerConfig.DCX_HANDSHAKE_MANIFEST;
      expect(DCX_HANDSHAKE_MANIFEST).to.not.be.null.and.not.be.undefined;
      expect(DCX_HANDSHAKE_MANIFEST).to.be.an('object');
      expect(DCX_HANDSHAKE_MANIFEST.id).to.equal('DCX-HANDSHAKE-MANIFEST');
      console.log(`      ✔ DCX_HANDSHAKE_MANIFEST=`, stringifier(DCX_HANDSHAKE_MANIFEST));
    });
  });
});
