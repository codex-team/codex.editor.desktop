const $ = require('./dom').default;
const Dialog = require('./dialog').default;

/**
 * Folders methods
 *
 * @typedef {Folder} Folder
 * @property {Number}    id                 - Folder's id
 * @property {string}    title              - Folder's title
 * @property {Array}     notes              - Notes list
 * @property {Array}     collaborators      - Collaborators list
 * @property {Element}   notesListWrapper   - Notes list holder
 */
export default class Folder {
  /**
   * Folder methods
   *
   * @param {Number} id     - Folder's id
   * @param {string} title  - Folder's title
   */
  constructor(id, title) {
    this._id = id;
    this._title = title;

    this.folderTitleElement = $.get('js-folder-title');

    /**
     * Load actual Folder's data
     * @type {Object}
     */
    let folderData = window.ipcRenderer.sendSync('folder - get', this._id);

    this.title = folderData.title;

    window.ipcRenderer.send('folder - get collaborators', {folder: this.id});
    window.ipcRenderer.once('folder - collaborators list', (event, {collaborators}) => {
      this.collaborators = collaborators;
      codex.notes.aside.folderSettings.showCollaborators(this.collaborators);
    });

    this.notesListWrapper = document.querySelector('[name="js-folder-notes-menu"]');

    /**
     * @todo asynchronous notes load
     */
    codex.notes.aside.loadNotes(id)
      .then( ({notes}) => {
        this.notes = notes;
        this.setNoteSeenStatus();
      })
      .then( () => this.clearNotesList() );
  }

  /**
   * Folder id getter
   */
  get id() {
    return this._id;
  }

  /**
   * Folder title getter
   */
  get title() {
    return this._title;
  }

  /**
   * Folder title setter
   * @param {String} newTitle
   */
  set title(newTitle) {
    this._title = newTitle;

    /**
     * Update in the Header
     */
    this.fillHeader();

    /**
     * Update in the Aside menu
     */
    codex.notes.aside.updateFolderTitleInMenu(this._id, this._title);
  }

  /**
   * Fills folder header block
   */
  fillHeader() {
    this.folderTitleElement.textContent = this._title;
  }

  /**
   * Clear list if there is no one note
   */
  clearNotesList() {
    this.notesListWrapper.innerHTML = '';
  }

  /**
   * Delete folder
   */
  delete() {
    if (Dialog.confirm('Are you sure you want to delete this folder?')) {
      if (window.ipcRenderer.sendSync('folder - delete', this._id)) {
        codex.notes.aside.removeFolderFromMenu(this._id);
        codex.notes.note.clear();
        return true;
      }
    }
    Dialog.error('Folder removing failed');
    return false;
  }

  /**
   * Checks note last seen time.
   * if note modification time is greater, then add badge
   */
  setNoteSeenStatus() {
    let noteIds = this.notes.map(note => note._id);

    /**
     * Check unread status of Notes in the Folder
     */
    codex.notes.aside.checkUnreadStatus(noteIds);
  }
}
