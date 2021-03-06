var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};
var dataDirectoryForm;
var providerFilePickerInstance;
var filePickerData = data.folder || {};
var folder;
var addEntryLinkAction;
var editEntryLinkAction;
var chatLinkAction;
var linkAddEntryProvider;
var linkEditEntryProvider;
var linkChatProvider;
// Set link action to screen by default
var chatLinkData = $.extend(true, {
  action: 'screen',
  page: '',
  transition: 'slide.left',
  options: {
    hideAction: true
  }
}, data.chatLinkAction);
var addEntryLinkData = $.extend(true, {
  action: 'screen',
  page: '',
  transition: 'slide.left',
  options: {
    hideAction: true
  }
}, data.addEntryLinkAction);
var editEntryLinkData = $.extend(true, {
  action: 'screen',
  page: '',
  transition: 'slide.left',
  options: {
    hideAction: true
  }
}, data.editEntryLinkAction);

function filePickerDataInit() {
  folder = $.extend(true, {
    selectedFiles: {},
    selectFiles: [], // To use the restore on File Picker
    selectMultiple: false,
    type: 'folder'
  }, data.folder);
}

function linkProviderInit() {
  linkChatProvider = Fliplet.Widget.open('com.fliplet.link', {
    // If provided, the iframe will be appended here,
    // otherwise will be displayed as a full-size iframe overlay
    selector: '#chat-screen',
    // Also send the data I have locally, so that
    // the interface gets repopulated with the same stuff
    data: chatLinkData,
    // Events fired from the provider
    onEvent: function(event, data) {
      if (event === 'interface-validate') {
        Fliplet.Widget.toggleSaveButton(data.isValid === true);
      }
    }
  });
  linkChatProvider.then(function(result) {
    chatLinkAction = result.data || {};
  });
  linkAddEntryProvider = Fliplet.Widget.open('com.fliplet.link', {
    // If provided, the iframe will be appended here,
    // otherwise will be displayed as a full-size iframe overlay
    selector: '#add-entry-link',
    // Also send the data I have locally, so that
    // the interface gets repopulated with the same stuff
    data: addEntryLinkData,
    // Events fired from the provider
    onEvent: function(event, data) {
      if (event === 'interface-validate') {
        Fliplet.Widget.toggleSaveButton(data.isValid === true);
      }
    }
  });
  linkAddEntryProvider.then(function(result) {
    addEntryLinkAction = result.data || {};
  });
  linkEditEntryProvider = Fliplet.Widget.open('com.fliplet.link', {
    // If provided, the iframe will be appended here,
    // otherwise will be displayed as a full-size iframe overlay
    selector: '#edit-entry-link',
    // Also send the data I have locally, so that
    // the interface gets repopulated with the same stuff
    data: editEntryLinkData,
    // Events fired from the provider
    onEvent: function(event, data) {
      if (event === 'interface-validate') {
        Fliplet.Widget.toggleSaveButton(data.isValid === true);
      }
    }
  });
  linkEditEntryProvider.then(function(result) {
    editEntryLinkAction = result.data || {};
    save(true);
  });
}

function init() {
  filePickerDataInit();
  linkProviderInit();
  attahObservers();
}

function attahObservers() {
  $(document).on('show.bs.collapse', '.panel-collapse', function() {
      $(this).siblings('.panel-heading').find('.fa-chevron-down').removeClass('fa-chevron-down').addClass('fa-chevron-up');
    })
    .on('hide.bs.collapse', '.panel-collapse', function() {
      $(this).siblings('.panel-heading').find('.fa-chevron-up').removeClass('fa-chevron-up').addClass('fa-chevron-down');
    });

  $('#folder-select').on('click', '.select-folder', function() {

    Fliplet.Widget.toggleSaveButton(data.folder && data.folder.selectFiles && data.folder.selectFiles.length > 0);

    Fliplet.Studio.emit('widget-save-label-update', {
      text: 'Select'
    });

    providerFilePickerInstance = Fliplet.Widget.open('com.fliplet.file-picker', {
      data: folder,
      onEvent: function(e, data) {
        switch (e) {
          case 'widget-rendered':
            break;
          case 'widget-set-info':
            Fliplet.Widget.toggleSaveButton(!!data.length);
            var msg = data.length ? data.length + ' files selected' : 'no selected files';
            Fliplet.Widget.info(msg);
            break;
          default:
            break;
        }
      }
    });

    providerFilePickerInstance.then(function(data) {
      Fliplet.Widget.info('');
      Fliplet.Widget.toggleCancelButton(true);
      Fliplet.Widget.toggleSaveButton(true);
      filePickerData.selectFiles = data.data.length ? data.data : [];
      providerFilePickerInstance = null;
      Fliplet.Studio.emit('widget-save-label-update', {
        text: 'Save & Close'
      });
      if (filePickerData.selectFiles.length) {
        $('#folder-select .select-folder').text('Replace folder');
        $('#folder-select .info-holder').removeClass('hidden');
        $('#folder-select .folder-title span').text(filePickerData.selectFiles[0].name);
      }
    });
  });

  $('.browse-files').on('click', function(e) {
    e.preventDefault();
    
    Fliplet.Studio.emit('overlay', {
      name: 'widget',
      options: {
        size: 'large',
        package: 'com.fliplet.file-manager',
        title: 'File Manager',
        classes: 'data-source-overlay',
        data: {
          context: 'overlay',
          appId: Fliplet.Env.get('appId'),
          folder: filePickerData.selectFiles[0],
          navStack: filePickerData.selectFiles[0].navStackRef || {}
        }
      }
    });
  });

  // 1. Fired from Fliplet Studio when the external save button is clicked
  Fliplet.Widget.onSaveRequest(function() {
    if (providerFilePickerInstance) {
      return providerFilePickerInstance.forwardSaveRequest();
    }

    Promise.all([
      linkChatProvider.forwardSaveRequest(),
      linkAddEntryProvider.forwardSaveRequest(),
      linkEditEntryProvider.forwardSaveRequest()
    ]);
  });
}

Fliplet.DataSources.get({
    type: null
  }, {
    cache: false
  })
  .then(function(dataSources) {
    if (!dataSources.length) {
      $('.no-data-source-prompt').show();
    }

    data.dataSources = dataSources;
    dataDirectoryForm = new DataDirectoryForm(data);
  });


function save(notifyComplete) {
  $('.alert.error').html('').removeClass('show');
  var errors = false;

  dataDirectoryForm.saveDataDirectoryForm_();
  dataDirectoryForm.directoryConfig.chatLinkAction = chatLinkAction;
  dataDirectoryForm.directoryConfig.addEntryLinkAction = addEntryLinkAction;
  dataDirectoryForm.directoryConfig.editEntryLinkAction = editEntryLinkAction;
  dataDirectoryForm.directoryConfig.folder = filePickerData && !_.isEmpty(filePickerData) ? filePickerData : dataDirectoryForm.directoryConfig.folder;

  if (dataDirectoryForm.directoryConfig.enable_chat && (!dataDirectoryForm.directoryConfig.chatLinkAction || typeof dataDirectoryForm.directoryConfig.chatLinkAction.page === 'undefined' || dataDirectoryForm.directoryConfig.chatLinkAction.page === '')) {
    $('.alert.error').append('<p>- You need to select a Chat screen.</p>');
    $('.alert.error').addClass('show');
    errors = true;
  }

  if (dataDirectoryForm.directoryConfig.addEntry.enabled && (!dataDirectoryForm.directoryConfig.addEntryLinkAction || typeof dataDirectoryForm.directoryConfig.addEntryLinkAction.page === 'undefined' || dataDirectoryForm.directoryConfig.addEntryLinkAction.page === '')) {
    $('.alert.error').append('<p>- You need to select a screen with a Form to add entries.</p>');
    $('.alert.error').addClass('show');
    errors = true;
  }

  if (dataDirectoryForm.directoryConfig.editEntry.enabled && (!dataDirectoryForm.directoryConfig.editEntryLinkAction || typeof dataDirectoryForm.directoryConfig.editEntryLinkAction.page === 'undefined'  || dataDirectoryForm.directoryConfig.editEntryLinkAction.page === '')) {
    $('.alert.error').append('<p>- You need to select a screen with a Form to edit entries.</p>');
    $('.alert.error').addClass('show');
    errors = true;
  }

  if (dataDirectoryForm.directoryConfig.enable_thumbs && dataDirectoryForm.directoryConfig.thumbnail_field === '') {
    $('.alert.error').append('<p>- You need to select a field to use as the thumbnail.</p>');
    $('.alert.error').addClass('show');
    errors = true;
  }

  if (dataDirectoryForm.directoryConfig.enable_thumbs && !dataDirectoryForm.directoryConfig.folder.selectFiles) {
    $('.alert.error').append('<p>- You need to select a folder that contains your thumbnails.</p>');
    $('.alert.error').addClass('show');
    errors = true;
  }

  if (!dataDirectoryForm.directoryConfig.source && dataDirectoryForm.directoryConfig.source === '') {
    $('.alert.error').append('<p>- You need to select a Data Source.</p>');
    $('.alert.error').addClass('show');
    errors = true;
  }

  if (errors) {
    return Fliplet.Widget.save(dataDirectoryForm.directoryConfig).then(function() {
      filePickerDataInit();
      linkProviderInit();
    });
  }

  return Fliplet.Widget.save(dataDirectoryForm.directoryConfig).then(function() {
    if (notifyComplete) {
      Fliplet.Widget.complete();
      Fliplet.Studio.emit('reload-page-preview');
    } else {
      Fliplet.Studio.emit('reload-widget-instance', widgetId);
    }
  });
}

init();