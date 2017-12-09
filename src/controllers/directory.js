'use strict';
let {ipcMain} = require('electron');

const Directory = require('../models/directory');

/**
 * Directory controller.
 * Works with events:
 *  - create folder
 *  - load folders list
 *  - delete folder
 */
class DirectoryController {

  /**
   * Setup event handlers
   */
  constructor() {
    this.directory = new Directory();

    ipcMain.on('create folder', (event, folderName) => {
      this.createFolder(event, folderName);
    });

    ipcMain.on('load folders list', (event) => {
      this.loadFolders(event);
    });

    ipcMain.on('delete folder', (event, folderId) => {
      this.deleteFolder(event, folderId);
    });

    ipcMain.on('folder - change name', (event, {id, name}) => {
      this.changeName(event, id, name);
    });

    ipcMain.on('folder - collaborator add', (event, {id, email}) => {
      this.addMember(event, id, email);
    });
  }

  /**
   * Load list of folders. Send event 'update folders list' with the following params:
   *  {
   *    userFolders: [{
   *      id - unique folder ID
   *      name - folder name (visible)
   *      notes: [] - array of notes
   *    }]
   *  }
   * @param event
   * @returns {Promise.<void>}
   */
  async loadFolders(event) {
    try {
      let userFolders = await this.directory.list();

      event.sender.send('update folders list', {userFolders});
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Create new folder. Return the following value to the event emitter:
   * {
   *  id - generated folder ID
   *  name - folder name (got from event emitter)
   *  notes - empty array of notes
   * }
   * @param event
   * @param folderName - new folder name
   */
  async createFolder(event, folderName) {
    try {
      let dir = await this.directory.create(folderName);

      event.returnValue = {
        'id': dir._id,
        'name': dir.name,
        'notes': dir.notes
      };
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Delete folder. Return bool result to the event emitter
   * @param event
   * @param folderId - folder to delete ID
   */
  async deleteFolder(event, folderId) {
    try {
      await this.directory.delete(folderId);
      event.returnValue = true;
    } catch (err) {
      console.log(err);
      event.returnValue = false;
    }
  }

  /**
   * Change folder name
   * @param {Event} event - see {@link https://electronjs.org/docs/api/ipc-main#event-object}
   * @param {ObjectId} id  - folder id
   * @param {string} name - new name
   */
  async changeName(event, id, name) {
    try {
      await this.directory.rename(id, name);
      event.returnValue = true;
    } catch (err) {
      console.log(err);
      event.returnValue = false;
    }
  }

  /**
   * Add new member to the folder as a collaborator
   * @param {Event} event - see {@link https://electronjs.org/docs/api/ipc-main#event-object}
   * @param {ObjectId} id  - folder id
   * @param {string} email - invited user
   */
  async addMember(event, id, email) {
    try {
      event.returnValue = await this.directory.addMember(id, email);
    } catch (err) {
      console.log(err);
      event.returnValue = false;
    }
  }
}

module.exports = DirectoryController;
