/**
 * ITrustedIssuer interface defines objects passed into DcxIssuer or DcxApplicant
 * DCX issuers are entities that issue credentials to applicants either prior to an application submission
 * or after a credential application response fulfillment. Meaning, the issuers listed in the DCX configuration
 * are either issuers you trust to sign credentials that are required for an application and/or issuers that you trust
 * to sign and issue credentials to the applicant on behalf of the DCX. These issuers can either be the DCX itself
 * or 3rd parties that do verification of raw data and issuance of VCs. The list of issuers within each DCX actor object
 * should be list of entities that are trusted to provide applicants with VCs or to issue applicants VCs.
 * The input VCs required for an application are defined in Credential Manifests: specifically the presentation_definition.input_descriptors
 * field. For more details, see {@link https://identity.foundation/credential-manifest/#input-evaluation}
 */
export interface ITrustedIssuer extends AdditionalProperties {
  name: string;
  id: string;
}
export class TrustedIssuer {
  constructor(
      public name: string,
      public id: string
  ) {}
}

// Handler
export type HandlerFunction = (...args: any[]) => any | Promise<any>;
export interface IHandler {
  id: string;
  handler: HandlerFunction;
}
export class Handler implements IHandler {
  constructor(
    public id: string,
    public handler: HandlerFunction
  ) {}
}

// Provider
export interface IProvider extends AdditionalProperties {
  id: string;
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
}
export class Provider implements IProvider {
  constructor(
        public id: string,
        public endpoint: string,
        public method?: string,
        public headers?: Record<string, string>,
  ) {}
}
export type DcxProtocolPath = 'manifest' | 'application' | 'application/response' | 'response' | any;
export type AdditionalProperties = Record<string, any>;