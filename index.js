'use strict';

const electron = require('electron');
const app = electron.app;
const locals = {title: 'CodeX Notes'};
const pug = require('electron-pug')({pretty:true}, locals);
const BrowserWindow = electron.BrowserWindow;
const Database = require('./api/database');
const Conn = require('./api/connection');
const APICall = require('./api/call');

let DB = new Database(app.getPath('userData'));
let Connection = new Conn();
let API = new APICall();
let notesCtrl = require('./controllers/notes');
let foldersCtrl = require('./controllers/folders');

let mainWindow = null;

app.on('window-all-closed', function () {
  app.quit();
});

app.on('ready', function () {
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 1070,
    minHeight: 600,
    height: 700,
    vibrancy: 'ultra-dark',
    backgroundColor: '#fff',
    titleBarStyle: 'hiddenInset'
  });

  if (process.platform === 'darwin') {
    const { Menu } = require('electron');

    let createMenuTemplate = require('./menu'),
        menues = createMenuTemplate(app),
        menuBar = Menu.buildFromTemplate(menues.menuBar),
        menuDock = Menu.buildFromTemplate(menues.menuDock);


    Menu.setApplicationMenu(menuBar);

    app.dock.setMenu(menuDock);
  }

  mainWindow.loadURL('file://' + __dirname + '/views/editor.pug');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  API.userRegistration();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
});