var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};
var dataDirectoryForm;
var providerFilePickerInstance;
var filePickerData = {};
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
  page: 'none',
  transition: 'slide.left',
  options: {
    hideAction: true
  }
}, data.chatLinkAction);
var addEntryLinkData = $.extend(true, {
  action: 'screen',
  page: 'none',
  transition: 'slide.left',
  options: {
    hideAction: true
  }
}, data.addEntryLinkAction);
var editEntryLinkData = $.extend(true, {
  action: 'screen',
  page: 'none',
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

function filePickerInit() {
  filePickerDataInit();
  if (providerFilePickerInstance) {
    providerFilePickerInstance = null;
    $('.file-picker-holder').html('');
  }
  providerFilePickerInstance = Fliplet.Widget.open('com.fliplet.file-picker', {
    selector: '.file-picker-holder',
    data: folder,
    onEvent: function(e, data) {
      switch (e) {
        case 'widget-set-info':
          Fliplet.Studio.emit('widget-save-label-reset');
          break;
      }
    },
    closeOnSave: false
  });

  providerFilePickerInstance.then(function(data) {
    filePickerData.selectFiles = data.data.length ? data.data : [];
    save(true);
  });
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
  })
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
  })
}

function init() {
  filePickerInit();
  linkProviderInit();
  attahObservers()
}

function attahObservers() {
  $(document).on('show.bs.collapse', '.panel-collapse', function() {
      $(this).siblings('.panel-heading').find('.fa-chevron-down').removeClass('fa-chevron-down').addClass('fa-chevron-up');
    })
    .on('hide.bs.collapse', '.panel-collapse', function() {
      $(this).siblings('.panel-heading').find('.fa-chevron-up').removeClass('fa-chevron-up').addClass('fa-chevron-down');
    });

  // 1. Fired from Fliplet Studio when the external save button is clicked
  Fliplet.Widget.onSaveRequest(function() {
    return Promise.all([
      linkChatProvider.forwardSaveRequest(),
      linkAddEntryProvider.forwardSaveRequest(),
      linkEditEntryProvider.forwardSaveRequest(),
      providerFilePickerInstance.forwardSaveRequest()
    ]);
  });
}

Fliplet.DataSources.get({ type: null })
  .then(function(dataSources) {
    if (!dataSources.length) {
      $('.no-data-source-prompt').show();
    }

    data.dataSources = dataSources;
    dataDirectoryForm = new DataDirectoryForm(data);
  });


function save(notifyComplete) {
  dataDirectoryForm.saveDataDirectoryForm_();
  dataDirectoryForm.directoryConfig.chatLinkAction = chatLinkAction;
  dataDirectoryForm.directoryConfig.addEntryLinkAction = addEntryLinkAction;
  dataDirectoryForm.directoryConfig.editEntryLinkAction = editEntryLinkAction;
  dataDirectoryForm.directoryConfig.folder = filePickerData;

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