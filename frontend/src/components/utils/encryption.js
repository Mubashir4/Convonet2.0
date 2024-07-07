// utils/encryption.js
import CryptoJS from 'crypto-js';

const secretKey = '19a8dcb5ef134c67b8e1f06d84c193e6b728d64f5d88a9a78e5cbd6c59e7ac24';

export const encryptData = (data) => {
  try {
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
    return ciphertext;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

export const decryptData = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};
