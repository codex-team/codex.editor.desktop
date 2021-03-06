const crypto = require('crypto');
const request = require('request-promise');

/**
 * Helpers
 */
class Utils {

  /**
   * Compare some items
   *
   * @param items
   *
   * @returns {boolean}
   */
  static equals(...items) {
    let firstStringified = JSON.stringify(items.shift());

    for (let i = items.length - 1; i >= 0; i--) {
      if (JSON.stringify(items[i]) !== firstStringified) {
        return false;
      }
    }

    return true;
  }

  /**
   * Show function's caller
   *
   * @returns {string}
   */
  static get caller() {
    return (new Error()).stack.split('\n').splice(3, 1).shift().trim();
  }

  /**
   * Show object beautifier
   *
   * @param obj
   *
   * @returns {string}
   */
  static print(obj) {
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Generates cryptographically strong pseudo-random data.
   * {@link https://nodejs.org/api/crypto.html#crypto_crypto_randombytes_size_callback}
   * @param {number} [size] - Number of bytes to generate.
   * @return {Promise<string>}
   */
  static async uniqId(size = 20) {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(size, (err, buf) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(buf.toString('hex'));
      });
    });
  }

  /**
   *
   * @param args
   * @return {Promise<*>}
   */
  static async webhookDebug(...args) {
    try {
      if (!process.env.WEBHOOK_DEBUG) {
        return;
      }

      let message = '';

      args.forEach(arg => {
        message += JSON.stringify(arg) + ' ';
      });

      return await request({
        url: process.env.WEBHOOK_DEBUG,
        method: 'POST',
        body: {
          message
        },
        json: true
      });
    } catch (e) {
      global.logger.debug('Error while sending webhook debug message: %s', e);
      global.catchException(e);
    }
  }
}

module.exports = Utils;
