const Dialog = require('./dialog').default;
const $ = require('./dom').default;
const Validate = require('./utils/validate').default;

/**
 * Folder Settings panel module
 *
 * @property {Boolean} opened - state
 */
export default class FolderSettings {
  /**
   * @constructor
   */
  constructor() {
    this.toggler = $.get('js-folder-settings-toggler');
    this.closeButton = $.get('js-close-folder');
    this.removeFolderButton = $.get('js-delete-folder');
    this.folderTitleInput = document.getElementsByName('folder-title')[0];
    this.newMemberInput = $.get('folder-new-member-input');
    this.loginButton = $.get('folder-login-button');
    this.membersList = $.get('js-members-list');

    this.toggler.addEventListener('click', () => {
      this.toggle();
    });

    this.closeButton.addEventListener('click', () => {
      this.close();
    });

    this.removeFolderButton.addEventListener('click', () => {
      this.removeFolderClicked();
    });

    this.folderTitleInput.addEventListener('keydown', event => this.changeTitleKeydown(event) );
    this.newMemberInput.addEventListener('keydown', event => this.inviteMemberKeydown(event) );
    this.loginButton.addEventListener('click', () => {
      codex.notes.user.showAuth();
    });

    window.ipcRenderer.on('folder - add collaborator', (event, collaborator) => {
      if (codex.notes.aside.currentFolder.id === collaborator.folderId) {
        this.addCollaborator(collaborator);
      }
    });
  }

  /**
   * CSS dictionary
   */
  static get CSS() {
    return {
      panelOpenedModifier: 'folder-settings-opened',
      wobble: 'wobble'
    };
  }

  /**
   * Open panel and change state
   */
  open() {
    document.body.classList.add(FolderSettings.CSS.panelOpenedModifier);
    this.opened = true;


    /**
     * Fill Folder's title input
     */
    this.folderTitleInput.value = codex.notes.aside.currentFolder.title || '';
  }

  /**
   * Close panel and change state
   */
  close() {
    document.body.classList.remove(FolderSettings.CSS.panelOpenedModifier);
    this.opened = false;
  }

  /**
   * Shows/hide this.panel
   */
  toggle() {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Handler for Remove Folder Button
   */
  removeFolderClicked() {
    console.assert(codex.notes.aside.currentFolder, 'Cannot remove Folder because it is not open');

    let result = codex.notes.aside.currentFolder.delete();

    if (result) {
      this.close();
      codex.notes.aside.closeFolder();
    }
  }

  /**
   * Handler for Change Title input
   * @param  {KeyboardEvent} event - keydowns
   */
  changeTitleKeydown(event) {
    if (event.key !== 'Enter') {
      return;
    }

    let input = event.target,
        title = input.value.trim(),
        id = codex.notes.aside.currentFolder._id;

    if (!title) {
      return;
    }

    /**
     * Send request for renaming
     * @type {object}
     */
    let result = window.ipcRenderer.sendSync('folder - change title', { id, title });

    if (!result) {
      Dialog.error('Folder renaming failed. Please, try again.');
      return false;
    }

    /**
     * Update title in the:
     *  - folder header
     *  - aside menu
     */
    codex.notes.aside.currentFolder.title = title;

    /**
     * Close folder settings
     */
    this.close();
  }

  /**
   * Handler for New Member input
   * @param {KeyboardEvent} event - keydowns
   */
  inviteMemberKeydown(event) {
    if (event.key !== 'Enter') {
      return;
    }

    let input = event.target,
        fieldset = input.parentNode,
        email = input.value.trim(),
        id = codex.notes.aside.currentFolder._id;

    if (!email || !Validate.email(email)) {
      fieldset.classList.add(FolderSettings.CSS.wobble);
      window.setTimeout(() => {
        fieldset.classList.remove(FolderSettings.CSS.wobble);
      }, 100);

      return;
    }

    /**
     * Send request for adding new collaborator
     * @type {object}
     */
    let result = window.ipcRenderer.sendSync('folder - collaborator add', { id, email });

    // Clear input field
    input.value = '';

    if (!result.success) {
      Dialog.error(result.message || 'Error while adding a collaborator to the folder');
      return false;
    }

    // this.addCollaborator({email});
  }

  /**
   * Add Collaborators to folder-settings panel
   *
   * @param {Array} collaborators
   */
  showCollaborators(collaborators) {
    this.membersList.innerHTML = '';

    collaborators.forEach(collaborator => {
      this.addCollaborator(collaborator);
    });
  }

  /**
   * Add Collaborator to the Collaborators list at folder-settings panel
   *
   * @param {String|null} collaborator.user.photo
   * @param {String} collaborator.email
   */
  addCollaborator(collaborator) {
    let newMemberItem = $.make('LI', [ 'member-list__item' ], {}),
        ava,
        memberEmailClasses = [ 'member-list__item-name' ];

    if (collaborator.user && collaborator.user.photo) {
      /** Add User's photo */
      ava = $.make('IMG', ['member-list__item-photo', 'member-list__item-photo--circled'], {
        src: collaborator.user.photo
      });
    } else {
      /** Add envelope icon */
      ava = $.make('IMG', [ 'member-list__item-photo' ], {
        src: '../../public/svg/envelope.svg'
      });

      memberEmailClasses.push('member-list__item--waiting');
    }

    /** Add ava block */
    $.append(newMemberItem, ava);

    let emailWrapper = $.make('div', 'member-list__item-name-wrapper');

    /** Create block with User's email */
    let newMemberEmail = $.make('SPAN', memberEmailClasses, {
      innerHTML: collaborator.email
    });

    /**
     * If email is longer that this count, it will be overflowed
     * @type {number}
     */
    const visibleCharsCount = 23;

    /**
     * Add class for elements with long email for the overflow animation
     */
    if (collaborator.email.length > visibleCharsCount) {
      emailWrapper.classList.add('member-list__item-name-wrapper--scrollable');
    }

    $.append(emailWrapper, newMemberEmail);
    $.append(newMemberItem, emailWrapper);

    /**
     * Add new row
     */
    $.append(this.membersList, newMemberItem);
  }

  /**
   * Toggle visibility of login button and new collaborator input
   */
  toggleCollaboratorInput() {
    if (codex.notes.authObserver.loggedIn) {
      this.loginButton.classList.add('hide');
      this.newMemberInput.classList.remove('hide');
      return;
    }

    this.loginButton.classList.remove('hide');
    this.newMemberInput.classList.add('hide');
  }
}
