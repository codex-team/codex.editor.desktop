'use strict';

const electron = require('electron');
const app = electron.app;

require('dotenv').config();

const BrowserWindow = electron.BrowserWindow;
let pkg = require('./../package.json');

/**
 * Enable Pug
 */
const locals = {
  title: 'CodeX Notes',
};
const pug = require('electron-pug')({
  cache: false,
  // debug: true,
  // compileDebug: true
}, locals);


/**
 * Synchronization controller
 */
const SyncObserver = require('./controllers/syncObserver');

/**
 * Folders controller
 */
const FoldersController = require('./controllers/folders');

/**
 * Notes controllers
 */
const NotesController = require('./controllers/notes');

/**
 * Authorization
 */
const AuthController = require('./controllers/auth');

/**
 * User Controller
 */
const UserController = require('./controllers/user');

/**
 * User model
 */
const User = require('./models/user');

/**
 * Database setup
 */
const db = require('./utils/database');

/**
 * All windows is closed
 */
app.on('window-all-closed', function () {
  app.quit();
});

/**
 * @class      CodexNotes
 * @classdesc  Main application class
 *
 * @typedef {CodexNotes} CodexNotes
 * @property {BrowserWindow} mainWindow
 */
class CodexNotes {

  /**
   * Initializes an application
   */
  constructor() {
    /**
     * Web links with codex:// protocol will be handled by application
     * @type {string}
     */
    this.appProtocol = 'codex';

    this.mainWindow = new BrowserWindow({
      title: pkg.productName,
      icon: __dirname + '/' + pkg.productIconPNG,
      width: 1200,
      minWidth: 1070,
      minHeight: 600,
      height: 700,
      // vibrancy: 'ultra-dark',
      backgroundColor: '#fff',
      titleBarStyle: 'hiddenInset',
      show: false
    });

    /**
     * @todo make crossplaform menu
     */
    if (process.platform === 'darwin') {
      this.makeMenu();
    }

    this.mainWindow.loadURL('file://' + __dirname + '/views/editor.pug');

    this.mainWindow.once('ready-to-show', () => {
      console.log('\nMain Window is ready to show. Let\'s go \n');
      this.mainWindow.show();
    });

    /** Open the DevTools. */
    if (process.env.DEBUG === 'true') {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.destroy();
    });

    /** Init controllers */
    this.initComponents()
      .then(() => {
        /** Set application protocol */
        this.setAppProtocol();
      });
  }

  /**
   * Activate controller
   */
  initComponents() {
    global.user = new User();
    db.makeInitialSettings(app.getPath('userData'));
    return global.user.init()
      .then(() => {

        console.log('Current user data is: ', global.user);
        this.folders = new FoldersController();
        this.notes = new NotesController();
        this.userCtrl = new UserController();
        this.auth = new AuthController();
        
        /**
         * @type {SyncObserver}
         */
        this.syncObserver = new SyncObserver();
        this.syncObserver.on('sync', (data) => {
          this.folders.renew(data.user.folders);
        });
      })
      .catch(function (err) {
        console.log('Initialization error', err);
      });
  }

  /**
   * Makes native application menu
   * @author @guryn
   */
  makeMenu() {
    const menu = electron.Menu;

    let createMenuTemplate = require('./menu'),
        menues = createMenuTemplate(app),
        menuBar = menu.buildFromTemplate(menues.menuBar),
        menuDock = menu.buildFromTemplate(menues.menuDock);

    menu.setApplicationMenu(menuBar);
    app.dock.setMenu(menuDock);
  }

  /**
   * Set app protocol to handle internal links
   */
  setAppProtocol() {
    app.setAsDefaultProtocolClient(this.appProtocol);
    app.on('open-url', this.auth.verifyCollaborator);
  }

  /**
   * Destroyes an application
   */
  destroy() {
    this.mainWindow = null;
  }

}

/**
 * Electron is ready
 */
app.on('ready', function () {
  try {
    global.app = new CodexNotes();
  } catch(error) {
    console.log(`\n\n
      ........................... \n\n
      CodeX Notes runtime error:
      ........................... \n\n
      `, error);
    console.log('\n\n ........................... \n\n');
  }
});
