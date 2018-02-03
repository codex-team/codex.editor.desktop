const db = require('../utils/database');
const Notes = require('../models/note');

/**
 * Time helper
 */
const Time = require('../utils/time.js');


/**
 * Simple GraphQL requests provider
 * {@link https://github.com/graphcool/graphql-request}
 */
const { GraphQLClient } = require('graphql-request');

/**
 * @class SyncObserver
 *
 * Sends new changes to the API server
 * Accepts changes from the API server
 *
 * @typedef {SyncObserver} SyncObserver
 * @property {GraphQLClient} api    - GraphQL API client
 * @property {Array} subscribers    - Provides simple EventEmitter {@link SyncObserver#on}
 */
module.exports = class SyncObserver {

  /**
   * fires observer initialization
   * @constructor
   */
  constructor() {
    this.setup();
    this.subscribers = [];
  }

  /**
   * Initialize params for the API
   */
  setup() {
    this.api = new GraphQLClient(process.env.API_ENDPOINT, {
      headers: {
        // Bearer scheme of authorization can be understood as 'give access to the bearer of this token'
        Authorization: 'Bearer ' + global.user.token,
      }
    });
  }

  /**
   * Prepare updates for API during synchronization
   * @param {Number} lastSyncTimestamp - Date of last synchronisation
   * @return {{folders: []|null, notes: []|null}}
   */
  async prepareUpdates(lastSyncTimestamp) {
    try {
      let changedFolders = await db.find(db.FOLDERS, {
        dtModify: {$gte: lastSyncTimestamp}
      });

      return {
        folders: changedFolders,
        notes: []
      };

    } catch (err) {
      console.log('Error during synchronization prepareUpdates: ', err);
      return false;
    }
  }

  /**
   * Sync changes with API server
   * @return {null|Promise.<object>}
   */
  async sync() {

    // if user is not logged in it doesn't make a sense to send request
    if (!global.user.token) {
      return;
    }

    let lastSyncDate = await global.user.getSyncDate();
    let currentTime = Time.now;

    /**
     * Get new updates from the last sync date
     * @type {{folders: []|null, notes: []|null}}
     */
    let updates = await this.prepareUpdates(lastSyncDate);

    console.log('SyncObserver: updates are ready for sending to the Cloud:', updates);

    /**
     * Sequence of mutations requests
     * @type {Array}
     */
    let syncMutationsSequence = [];

    /**
     * Push Folders mutations to the Sync Mutations Sequence
     */
    if (updates.folders.length) {
      syncMutationsSequence.push(...updates.folders.map( folder => {
        return this.sendFolder(folder);
      }));
    }

    /**
     * Send mutations sequence and renew synchronisation date when it will be finished
     */
    try {
      await Promise.all(syncMutationsSequence);

      global.user.setSyncDate(currentTime).then((resp) => {
        console.log('Synchronisation\'s date renovated:', currentTime);
      }).catch(e => {
        console.log('SyncObserver cannot renovate the sync date: ', e);
      });
    } catch (sequenceError) {
      console.log('SyncObserver: something failed due to mutation sequence', sequenceError);
    }

    /**
     * Load updates from the Cloud
     */
    let updatesFromCloud = await this.getUpdates();

    return updatesFromCloud;
  }
  /**
   * Requests updates from the cloud
   * @return {Promise<object>}
   */
  async getUpdates(){

    /**
     * Sync Query
     * @type {String}
     */
    let query = require('../graphql/sync');

    let syncVariables = {
      userId: global.user ? global.user.id : null
    };

    return this.api.request(query, syncVariables)
      .then( data => {
        console.log('\n( ͡° ͜ʖ ͡°) SyncObserver received data: \n\n', data);
        this.emit('sync', data);
        return data;
      })
      .catch( error => {
        console.log('[!] Synchronization failed because of ', error);
      });
  }

  /**
   * Emit Event to the each subscriber
   * @param {String} event - Event name
   * @param {*} data       - Data to pass with Event
   */
  emit(event, data) {

    this.subscribers.forEach(sub => {
      if (sub.event !== event) {
        return;
      }

      sub.callback.call(null, data);
    });

  }

  /**
   * Add subscriber to the passed event
   * @param {String} event - on what SyncObserver Event you want to subscribe
   * @param {Function} callback - what callback we should fire with the Event
   */
  on(event, callback) {
    this.subscribers.push({
      event,
      callback
    });
  }

  /**
   * Send Folder Mutation
   * @param {FolderData} folder
   * @return {Promise<object>}
   */
  sendFolder(folder){

    let query = require('../graphql/mutations/folder');

    let variables = {
      ownerId: global.user ? global.user.id : null,
      id: folder._id,
      title: folder.title || '',
      dtModify: folder.dtModify || null,
      dtCreate: folder.dtCreate || null,
      isRoot: folder.isRoot
    };

    return this.api.request(query, variables)
      .then( data => {
        console.log('\n(ღ˘⌣˘ღ) SyncObserver sends Folder Mutation and received a data:', data);
      })
      .catch( error => {
        console.log('[!] Folder Mutation failed because of ', error);
      });
  }
};
