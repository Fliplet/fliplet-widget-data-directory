var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};
var dataDirectoryForm;

// Set link action to screen by default
if (!data.chatLinkAction) {
  data.chatLinkAction = {
    action: 'screen',
    options: {
      hideAction: true
    }
  };
}

var linkChatProvider = Fliplet.Widget.open('com.fliplet.link', {
  // If provided, the iframe will be appended here,
  // otherwise will be displayed as a full-size iframe overlay
  selector: '#chat-screen',
  // Also send the data I have locally, so that
  // the interface gets repopulated with the same stuff
  data: data.chatLinkAction,
  // Events fired from the provider
  onEvent: function (event, data) {
    if (event === 'interface-validate') {
      Fliplet.Widget.toggleSaveButton(data.isValid === true);
    }
  }
});

Fliplet.DataSources.get({ type: null })
  .then(function (dataSources) {
    if (!dataSources.length) {
      $('.no-data-source-prompt').show();
    }

    data.dataSources = dataSources;
    dataDirectoryForm = new DataDirectoryForm(data);
  });

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  linkChatProvider.forwardSaveRequest();
  dataDirectoryForm.saveDataDirectoryForm_();
  linkChatProvider.then(function (result) {
    dataDirectoryForm.directoryConfig.chatLinkAction = result.data || {};

    Fliplet.Widget.save(dataDirectoryForm.directoryConfig).then(function () {
      Fliplet.Studio.emit('reload-page-preview');
      Fliplet.Widget.complete();
    });
  });
});
