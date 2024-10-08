import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import {
  AgentCryptoApi,
  IdentityVault,
  IdentityVaultBackup,
  IdentityVaultBackupData,
  IdentityVaultParams,
  IdentityVaultStatus,
  LocalKeyManager
} from '@web5/agent';
import { Convert, KeyValueStore, LevelStore } from '@web5/common';
import { Jwk } from '@web5/crypto';
import { BearerDid, DidDht, DidDhtCreateOptions } from '@web5/dids';
import { HDKey } from 'ed25519-keygen/hdkey';
import {
  isEmptyString,
  isIdentityVaultBackup,
  isIdentityVaultStatus,
  isPortableDid
} from './index.js';
import { CompactJwe } from './prototyping/crypto/jose/jwe-compact.js';
import { JweHeaderParams } from './prototyping/crypto/jose/jwe.js';
import { DeterministicKeyGenerator } from './prototyping/crypto/utils.js';

export type DcxIdentityVaultInitializeParams = {
  /**
   * The password used to secure the vault.
   *
   * The password selected should be strong and securely managed to prevent unauthorized access.
   */
  password: string;

  /**
   * An optional recovery phrase used to derive the cryptographic keys for the vault.
   *
   * Providing a recovery phrase can be used to recover the vault's content or establish a
   * deterministic key generation scheme. If not provided, a new recovery phrase will be generated
   * during the initialization process.
   */
  recoveryPhrase?: string;

  /**
   * An array of Decentralized Web Node (DWN) endpoints associated with the DID.
   *
   * The DWN endpoints are used to resolve the DID and interact with the DID Document.
   */
  dwnEndpoints: string[];
};

export type DcxIdentityVaultParams = IdentityVaultParams & { location?: string };
export class DcxIdentityVault implements IdentityVault<{ InitializeResult: string }> {
  /** Provides cryptographic functions needed for secure storage and management of the vault. */
  public crypto = new AgentCryptoApi();

  /** Determines the computational intensity of the key derivation process. */
  keyDerivationWorkFactor: number;

  /** The underlying key-value store for the vault's encrypted content. */
  store: KeyValueStore<string, string>;

  /** The cryptographic key used to encrypt and decrypt the vault's content securely. */
  contentEncryptionKey: Jwk | undefined;

  constructor({
    keyDerivationWorkFactor,
    store,
    location
  }: DcxIdentityVaultParams = { location: 'DATA/DCX/AGENT/VAULT_STORE' }) {
    this.keyDerivationWorkFactor = keyDerivationWorkFactor ?? 210_000;
    this.store = store ?? new LevelStore<string, string>({ location });
  }

  public async changePassword({ oldPassword, newPassword }: {
    oldPassword: string;
    newPassword: string;
  }): Promise<void> {
    // Verify the identity vault has already been initialized.
    if (await this.isInitialized() === false) {
      throw new Error(
        'DcxIdentityVault: Unable to proceed with the change password operation because the ' +
        'identity vault has not been initialized. Please ensure the vault is properly ' +
        'initialized with a secure password before trying again.'
      );
    }

    // Lock the vault.
    await this.lock();

    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this.getStoredContentEncryptionKeyDcx();

    // Decrypt the compact JWE using the given `oldPassword` to verify it is correct.
    let protectedHeader: JweHeaderParams;
    let contentEncryptionKey: Jwk;
    try {
      let contentEncryptionKeyBytes: Uint8Array;
      ({ plaintext: contentEncryptionKeyBytes, protectedHeader } = await CompactJwe.decrypt({
        jwe        : cekJwe,
        key        : Convert.string(oldPassword).toUint8Array(),
        crypto     : this.crypto,
        keyManager : new LocalKeyManager()
      }));
      contentEncryptionKey = Convert.uint8Array(contentEncryptionKeyBytes).toObject() as Jwk;

    } catch (error: any) {
      throw new Error(`DcxIdentityVault: Unable to change the vault password due to an incorrectly entered old password.`);
    }

    // Re-encrypt the vault content encryption key (CEK) using the new password.
    const newCekJwe = await CompactJwe.encrypt({
      key        : Convert.string(newPassword).toUint8Array(),
      protectedHeader, // Re-use the protected header from the original JWE.
      plaintext  : Convert.object(contentEncryptionKey).toUint8Array(),
      crypto     : this.crypto,
      keyManager : new LocalKeyManager()
    });

    // Update the vault with the new CEK JWE.
    await this.store.set('contentEncryptionKey', newCekJwe);

    // Update the vault CEK in memory, effectively unlocking the vault.
    this.contentEncryptionKey = contentEncryptionKey;
  }
  public async getStatus(): Promise<IdentityVaultStatus> {
    const storedStatus = await this.store.get('vaultStatus');
    if (!storedStatus) {
      return {
        initialized : false,
        lastBackup  : null,
        lastRestore : null,
      };
    }

    const vaultStatus = Convert.string(storedStatus).toObject();
    if (!isIdentityVaultStatus(vaultStatus)) {
      throw new Error('DcxIdentityVault: Invalid IdentityVaultStatus object in store');
    }

    return vaultStatus;
  }

  private async getStoredDidDcx(): Promise<string> {
    const didJwe = await this.store.get('did');
    if (!didJwe) {
      throw new Error(
        'DcxIdentityVault: Unable to retrieve the DID record from the vault. Please check the ' +
        'vault status and if the problem persists consider re-initializing the vault and ' +
        'restoring the contents from a previous backup.',
      );
    }

    return didJwe;
  }

  public async getDid(): Promise<BearerDid> {
    if (this.isLocked()) {
      throw new Error(`DcxIdentityVault: Vault has not been initialized and unlocked.`);
    }

    const didJwe = await this.getStoredDidDcx();
    const { plaintext: portableDidBytes } = await CompactJwe.decrypt({
      jwe        : didJwe,
      key        : this.contentEncryptionKey!,
      crypto     : this.crypto,
      keyManager : new LocalKeyManager(),
    });

    const portableDid = Convert.uint8Array(portableDidBytes).toObject();
    if (!isPortableDid(portableDid)) {
      throw new Error('DcxIdentityVault: Unable to decode malformed DID in identity vault');
    }

    return await BearerDid.import({ portableDid });
  }

  public async isInitialized(): Promise<boolean> {
    return this.getStatus().then(({ initialized }) => initialized);
  }

  public isLocked(): boolean {
    return !this.contentEncryptionKey;
  }

  public async lock(): Promise<void> {
    if ((await this.isInitialized()) === false) {
      throw new Error(`DcxIdentityVault: Lock operation failed. Vault has not been initialized.`);
    }

    if (this.contentEncryptionKey) this.contentEncryptionKey.k = '';
    this.contentEncryptionKey = undefined;
  }

  public async restore({
    backup,
    password,
  }: {
    backup: IdentityVaultBackup;
    password: string;
  }): Promise<void> {
    // Validate the backup object.
    if (!isIdentityVaultBackup(backup)) {
      throw new Error(`DcxIdentityVault: Restore operation failed due to invalid backup object.`);
    }

    // Temporarily save the status and contents of the data store while attempting to restore the
    // backup so that they are not lost in case the restore operation fails.
    let previousStatus: IdentityVaultStatus;
    let previousContentEncryptionKey: string;
    let previousDid: string;
    try {
      previousDid = await this.getStoredDidDcx();
      previousContentEncryptionKey = await this.getStoredContentEncryptionKeyDcx();
      previousStatus = await this.getStatus();
    } catch {
      throw new Error(
        'DcxIdentityVault: The restore operation cannot proceed because the existing vault ' +
        'contents are missing or inaccessible. If the problem persists consider re-initializing ' +
        'the vault and retrying the restore.',
      );
    }

    try {
      // Convert the backup data to a JSON object.
      const backupData = Convert.base64Url(backup.data).toObject() as IdentityVaultBackupData;

      // Restore the backup to the data store.
      await this.store.set('did', backupData.did);
      await this.store.set('contentEncryptionKey', backupData.contentEncryptionKey);
      await this.setStatusDcx(backupData.status);

      // Attempt to unlock the vault with the given `password`.
      await this.unlock({ password });
    } catch (error: any) {
      // If the restore operation fails, revert the data store to the status and contents that were
      // saved before the restore operation was attempted.
      await this.setStatusDcx(previousStatus);
      await this.store.set('contentEncryptionKey', previousContentEncryptionKey);
      await this.store.set('did', previousDid);

      throw new Error(
        'DcxIdentityVault: Restore operation failed due to invalid backup data or an incorrect ' +
        'password. Please verify the password is correct for the provided backup and try again.',
      );
    }

    // Update the last restore timestamp in the data store.
    await this.setStatusDcx({ lastRestore: new Date().toISOString() });
  }

  public async unlock({ password }: { password: string }): Promise<void> {
    // Lock the vault.
    await this.lock();

    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this.getStoredContentEncryptionKeyDcx();

    // Decrypt the compact JWE.
    try {
      const { plaintext: contentEncryptionKeyBytes } = await CompactJwe.decrypt({
        jwe        : cekJwe,
        key        : Convert.string(password).toUint8Array(),
        crypto     : this.crypto,
        keyManager : new LocalKeyManager(),
      });
      const contentEncryptionKey = Convert.uint8Array(contentEncryptionKeyBytes).toObject() as Jwk;

      // Save the content encryption key in memory, thereby unlocking the vault.
      this.contentEncryptionKey = contentEncryptionKey;
    } catch (error: any) {
      throw new Error(`DcxIdentityVault: Unable to unlock the vault due to an incorrect password.`);
    }
  }

  public async backup(): Promise<IdentityVaultBackup> {
    // Verify the identity vault has already been initialized and unlocked.
    if (this.isLocked() || await this.isInitialized() === false) {
      throw new Error(
        'HdIdentityVault: Unable to proceed with the backup operation because the identity vault ' +
        'has not been initialized and unlocked. Please ensure the vault is properly initialized ' +
        'with a secure password before attempting to backup its contents.'
      );
    }

    // Encode the encrypted CEK and DID as a single Base64Url string.
    const backupData: IdentityVaultBackupData = {
      did                  : await this.getStoredDidDcx(),
      contentEncryptionKey : await this.getStoredContentEncryptionKeyDcx(),
      status               : await this.getStatus()
    };
    const backupDataString = Convert.object(backupData).toBase64Url();

    // Create a backup object containing the encrypted vault contents.
    const backup: IdentityVaultBackup = {
      data        : backupDataString,
      dateCreated : new Date().toISOString(),
      size        : backupDataString.length
    };

    // Update the last backup timestamp in the data store.
    await this.setStatusDcx({ lastBackup: backup.dateCreated });

    return backup;
  }

  public async initialize({
    password,
    recoveryPhrase,
    dwnEndpoints,
  }: DcxIdentityVaultInitializeParams): Promise<string> {
    if (await this.isInitialized()) {
      throw new Error(`DcxIdentityVault: Vault has already been initialized.`);
    }

    if (isEmptyString(password)) {
      throw new Error(
        `DcxIdentityVault: The password is required and cannot be blank. Please provide a ' +
            'valid, non-empty password.`,
      );
    }

    if (recoveryPhrase && isEmptyString(recoveryPhrase)) {
      throw new Error(
        `DcxIdentityVault: The password is required and cannot be blank. Please provide a ' +
            'valid, non-empty password.`,
      );
    }

    recoveryPhrase ??= generateMnemonic(wordlist, 128);

    if (!validateMnemonic(recoveryPhrase, wordlist)) {
      throw new Error(
        'DcxIdentityVault: The provided recovery phrase is invalid. Please ensure that the ' +
        'recovery phrase is a correctly formatted series of 12 words.',
      );
    }
    const rootSeed = await mnemonicToSeed(recoveryPhrase);
    const rootHdKey = HDKey.fromMasterSeed(rootSeed);

    const vaultHdKey = rootHdKey.derive(`m/44'/0'/0'/0'/0'`);

    const contentEncryptionKey = await this.crypto.deriveKey({
      algorithm           : 'HKDF-512', // key derivation function
      baseKeyBytes        : vaultHdKey.privateKey, // input keying material
      salt                : '', // empty salt because private key is sufficiently random
      info                : 'vault_cek', // non-secret application specific information
      derivedKeyAlgorithm : 'A256GCM', // derived key algorithm
    });

    const saltInput = await this.crypto.deriveKeyBytes({
      algorithm    : 'HKDF-512', // key derivation function
      baseKeyBytes : vaultHdKey.publicKey, // input keying material
      salt         : '', // empty salt because public key is sufficiently random
      info         : 'vault_unlock_salt', // non-secret application specific information
      length       : 256, // derived key length, in bits
    });

    const cekJwe = await CompactJwe.encrypt({
      key             : Convert.string(password).toUint8Array(),
      protectedHeader : {
        alg : 'PBES2-HS512+A256KW',
        enc : 'A256GCM',
        cty : 'text/plain',
        p2c : this.keyDerivationWorkFactor,
        p2s : Convert.uint8Array(saltInput).toBase64Url(),
      },
      plaintext  : Convert.object(contentEncryptionKey).toUint8Array(),
      crypto     : this.crypto,
      keyManager : new LocalKeyManager(),
    });

    await this.store.set('contentEncryptionKey', cekJwe);

    const identityHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/0'`);
    const identityPrivateKey = await this.crypto.bytesToPrivateKey({
      algorithm       : 'Ed25519',
      privateKeyBytes : identityHdKey.privateKey,
    });

    const signingHdKey = rootHdKey.derive(`m/44'/0'/1708523827'/0'/1'`);
    const signingPrivateKey = await this.crypto.bytesToPrivateKey({
      algorithm       : 'Ed25519',
      privateKeyBytes : signingHdKey.privateKey,
    });

    const deterministicKeyGenerator = new DeterministicKeyGenerator();
    await deterministicKeyGenerator.addPredefinedKeys({
      privateKeys : [identityPrivateKey, signingPrivateKey],
    });

    const options = {
      verificationMethods : [
        {
          algorithm : 'Ed25519',
          id        : 'sig',
          purposes  : ['assertionMethod', 'authentication']
        },
      ]
    } as DidDhtCreateOptions<DeterministicKeyGenerator>;

    if(dwnEndpoints && !!dwnEndpoints.length) {
      options.services = [
        {
          id              : 'dwn',
          type            : 'DecentralizedWebNode',
          serviceEndpoint : dwnEndpoints,
          enc             : '#enc',
          sig             : '#sig',
        }
      ];
    }

    const did = await DidDht.create({ keyManager: deterministicKeyGenerator, options });

    const portableDid = await did.export();

    const didJwe = await CompactJwe.encrypt({
      key             : contentEncryptionKey,
      plaintext       : Convert.object(portableDid).toUint8Array(),
      protectedHeader : {
        alg : 'dir',
        enc : 'A256GCM',
        cty : 'json',
      },
      crypto     : this.crypto,
      keyManager : new LocalKeyManager(),
    });

    // Store the compact JWE in the data store.
    await this.store.set('did', didJwe);

    this.contentEncryptionKey = contentEncryptionKey;

    await this.setStatusDcx({ initialized: true });

    return recoveryPhrase;
  }

  private async setStatusDcx({
    initialized,
    lastBackup,
    lastRestore,
  }: Partial<IdentityVaultStatus>): Promise<boolean> {
    // Get the current status values from the store, if any.
    const vaultStatus = await this.getStatus();

    // Update the status properties with new values specified, if any.
    vaultStatus.initialized = initialized ?? vaultStatus.initialized;
    vaultStatus.lastBackup = lastBackup ?? vaultStatus.lastBackup;
    vaultStatus.lastRestore = lastRestore ?? vaultStatus.lastRestore;

    // Write the changes to the store.
    await this.store.set('vaultStatus', JSON.stringify(vaultStatus));

    return true;
  }

  private async getStoredContentEncryptionKeyDcx(): Promise<string> {
    // Retrieve the content encryption key (CEK) record as a compact JWE from the data store.
    const cekJwe = await this.store.get('contentEncryptionKey');

    if (!cekJwe) {
      throw new Error(
        'DcxIdentityVault: Unable to retrieve the Content Encryption Key record from the vault. ' +
        'Please check the vault status and if the problem persists consider re-initializing the ' +
        'vault and restoring the contents from a previous backup.',
      );
    }

    return cekJwe;
  }
}
