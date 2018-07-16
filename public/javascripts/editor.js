const $ = require('./dom').default;
const common = require('./utils/common').default;


/**
 * CodeX Editor module
 */
export default class Editor {
  /**
  * @constructor
  * @property {String}  path          - CodeX Editor library path
  * @property {Array}   plugins       - plugins names
  * @property {TimerId} autosaveTimer - autosave debounce timer
  */
  constructor() {
    /**
     * Path to Editor sources dir
     */
    this.path = '../../public/codex.editor/';

    /**
     * List of plugins
     */
    this.plugins = [
      'text',
      'header'
    ];

    /**
     * List of inline-tools
     */
    this.inlineTools = [
      'term'
    ];

    /**
     * Element to be wrapper for an Editor
     */
    this.editorZoneId = 'codex-editor';

    /**
     * Editor's instance
     */
    this.instance = null;

    this.loadEditor()
      .then(() => this.loadPlugins())
      .then(() => this.init());
  }



  /**
   * Loads CodeX Editor sources
   * @return {Promise}
   */
  loadEditor() {
    return $.loadResource('JS', this.path + 'build/codex-editor.js', 'codex-editor');
  }

  /**
   * Loads CodeX Editor plugins
   * @return {Promise}
   */
  loadPlugins() {
    let pluginsQuery = [];

    /**
     * Load plugins
     */
    this.plugins.forEach( name => {
      pluginsQuery.push(...[
        $.loadResource('JS', this.path + 'example/plugins/' + name + '/' + name + '.js', name),
        $.loadResource('CSS', this.path + 'example/plugins/' + name + '/' + name + '.css', name)
      ]);
    });

    /**
     * Load inline-tools
     */
    this.inlineTools.forEach( name => {
      pluginsQuery.push(...[
        $.loadResource('JS', this.path + 'example/tools-inline/' + name + '/' + name + '.js', name),
        $.loadResource('CSS', this.path + 'example/tools-inline/' + name + '/' + name + '.css', name)
      ]);
    });

    return Promise.all(pluginsQuery)
      .catch( err => console.warn('Cannot load plugin: ', err))
      .then( () => console.log('Plugins loaded') );
  }

  /**
   * Init CodeX Editor
   * @return {[type]} [description]
   */
  init() {
    this.instance = new CodexEditor({
      holderId : this.editorZoneId,
      initialBlock : 'paragraph',
      placeholder: 'Your story',
      tools: {
        paragraph: Text,
        header: Header,
        term: Term
      },
      toolsConfig: {
        paragraph: {
          inlineToolbar : true,
        }
      },
      data: {
        items: []
      }
    });

    /**
     * Wait some time and init autosave function
     */
    window.setTimeout(() => {
      /**
       * Create a wrapper with debouncing for codex.notes.note.save()
       *
       * @type {Function|*}
       */
      this.saveNoteDebouncedFunction = common.debounce(() => {
        codex.notes.note.save();
      }, 500);

      this.enableAutosave();
    }, 500);
  }

  /**
   * Add keyup listener to editor zone
   */
  enableAutosave() {
    let noteTitle = document.getElementById('note-title'),
        editorZone = document.getElementById(this.editorZoneId);

    noteTitle.addEventListener('keyup', this.saveNoteDebouncedFunction);
    editorZone.addEventListener('keyup', this.saveNoteDebouncedFunction);
  }

  /**
   * Remove keyup listener to editor zone
   */
  disableAutosave() {
    let noteTitle = document.getElementById('note-title'),
        editorZone = document.getElementById(this.editorZoneId);

    noteTitle.removeEventListener('keyup', this.saveNoteDebouncedFunction);
    editorZone.removeEventListener('keyup', this.saveNoteDebouncedFunction);
  }
}
