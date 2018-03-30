'use strict';

const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');
const Time = require('../utils/time.js');

/**
 * Database class. neDB - https://github.com/louischatriot/nedb.
 */
class Database {

  constructor() {}

  refresh() {
    this.USER = new Datastore({ filename: path.join(this.appFolder, 'user.db'), autoload: true});
    this.FOLDERS = new Datastore({ filename: path.join(this.appFolder, 'folders.db'), autoload: true});
    this.NOTES = new Datastore({ filename: path.join(this.appFolder, 'notes.db'), autoload: true});
    this.COLLABORATORS = new Datastore({ filename: path.join(this.appFolder, 'collaborators.db'), autoload: true });
    this.VISITS = new Datastore({ filename: path.join(this.appFolder, 'visits.db'), autoload: true });
  }

  /**
   * - Create codex.notes directory in user's «App Data» (relative on the OS) folder
   * - Initialize collections User, Folders and Notes
   * - Create Root Folder if it doesn't exist.
   * @returns {Promise.<void>}
   */
  async makeInitialSettings(appFolder) {
    global.logger.debug('Making initial database settings...');

    this.appFolder = appFolder;

    if (!fs.existsSync(this.appFolder)) {
      fs.mkdirSync(this.appFolder);
    }
    global.logger.debug(`Local data storage is in "${this.appFolder}" directory`);

    // create database instances
    this.refresh();

    // this.drop();
    // this.showDB();

    this.getRootFolderId()
      .then(rootFolderId => {
        global.logger.debug('\nRoot Folder found: ', rootFolderId);
      })
      .catch(err => {
        global.logger.debug('\nCan not find the Root Folder\'s id because of: ', err);

        this.insert(this.FOLDERS, {
          'isRoot': true,
          'ownerId': null,
          'title': 'Root Folder',
          'notes': [],
          'dtCreate': Time.now,
          'dtModify': Time.now
        }).then(rootFolderCreated => {
          global.logger.debug('\nRoot Folder created: ', rootFolderCreated._id);
        }).catch(err => {
          global.logger.debug('\nCan not create the Rood Folder because of: ', err);
        });
      });
  }

  /**
   * Show Folder and Notes collections contents
   * For local-development only
   */
  showDB() {
    if (process.env.DEBUG !== 'true') {
      throw Error('Datastore dropping is not allowed for current environment');
    }

    this.FOLDERS.find({}, {multi: true}, (err, docs) => {
      global.logger.debug('Folders in the DB: \n');
      docs.forEach( doc => {
        global.logger.debug(doc);
        global.logger.debug('\n');
      });
    });

    this.NOTES.find({}, {multi: true}, (err, docs) => {
      global.logger.debug('Notes in the DB: \n');
      docs.forEach( doc => {
        global.logger.debug(doc);
        global.logger.debug('\n');
      });
    });
  }

  /**
   * Drop Folders and Notes collections.
   * For local-development only
   *
   * @param {Boolean} force - force drop.
   */
  drop(force = false) {
    if ( !force || ( process.env.DEBUG !== 'true' && !force )) {
      throw Error('Datastore dropping is not allowed for current environment');
    }

    let sequence = [];

    [this.USER, this.FOLDERS, this.NOTES, this.COLLABORATORS, this.VISITS].forEach( collection => {
      global.logger.debug('\n\n Drop ', collection.filename, '\n\n');
      sequence.push(this.remove(collection, {}, {multi: true}, (removedRows) => {
        global.logger.debug(collection.filename, ': ', removedRows, ' docs removed');
      }));
    });

    this.USER = null;
    this.FOLDERS = null;
    this.NOTES = null;
    this.COLLABORATORS = null;
    this.VISITS = null;

    return Promise.all(sequence)
        .catch((err) => {
            throw Error('Couldn\'t drop the database', err);
        });
  }

  /**
   * Return Root Folder that was create on the first opening
   * {@link Database#makeInitialSettings}
   */
  getRootFolderId() {
    return new Promise((resolve, reject) => {
      this.findOne(this.FOLDERS, {'isRoot': true }, {}).then(rootFolder => {
        if (rootFolder) {
          resolve(rootFolder._id);
        }

        reject('Root Folder was not found');
      }).catch( err => {
        global.logger.debug('Database#getRootFolderId: Can not find Root Folder because: ', err);
        reject(err);
      });
    });
  }

  find(collection, query) {
    return new Promise((resolve, reject) => {
      collection.find(query, function (err, docs) {
        if (err) {
          reject(err);
        }

        resolve(docs);
      });
    });
  }

  findOne(collection, query) {
    return new Promise((resolve, reject) => {
      collection.findOne(query, function (err, doc) {
        if (err) {
          reject(err);
        }

        resolve(doc);
      });
    });
  }

  insert(collection, data) {
    return new Promise((resolve, reject) => {
      collection.insert(data, function (err, insertedData) {
        if (err) {
          reject(err);
        }

        resolve(insertedData);
      });
    });
  }

  /**
   * Update query
   * @see https://github.com/louischatriot/nedb#updating-documents
   *
   * @param  {Object} query       - is a query object to find records that need to be updated (see Queries)
   * @param  {Object} data        - update is the replacement object
   * @param  {Object} options
   * @param  {Boolean|null} options.multi   - update all records that match the query object, default is false (only the first one found is updated)
   * @param  {Boolean|null} options.upsert  - if true and no records match the query, insert update as a new record
   * @param  {Boolean|null} options.raw     - driver returns updated document as BSON binary Buffer, default:false
   * @param  {Boolean|null} options.returnUpdatedDocs  -  (defaults to false, not MongoDB-compatible)
   *                                                      if set to true and update is not an upsert,
   *                                                      will return the array of documents matched by the find query
   *                                                      and updated. Updated documents will be returned even if
   *                                                      the update did not actually modify them.
   *
   * @return {Promise<{numAffected: number, affectedDocuments: object|null}>}
   */
  update(collection, query, data, options = {}) {
    return new Promise((resolve, reject) => {
      collection.update(query, data, options, function (err, numAffected, affectedDocuments, upsert) {
        if (err) {
          reject(err);
        }

        /**
         * For an upsert,
         *    affectedDocuments contains the inserted document and the upsert flag is set to true.
         *
         * For a standard update with returnUpdatedDocs flag set to false,
         *    affectedDocuments is not set.
         *
         * For a standard update with returnUpdatedDocs flag set to true and multi to false,
         *    affectedDocuments is the updated document.
         *
         * For a standard update with returnUpdatedDocs flag set to true and multi to true,
         *    affectedDocuments is the array of updated documents.
         */
        resolve({
          numAffected,
          affectedDocuments,
          upsert
        });
      });
    });
  }

  remove(collection, query, options, callback) {
    return new Promise((resolve, reject) => {
      collection.remove(query, options, function (err, numDeleted) {
        if (err) {
          reject(err);
        }

        if (callback && typeof callback === 'function') {
          callback(numDeleted);
        }

        resolve(numDeleted);
      });
    });
  }
}

module.exports = new Database();
