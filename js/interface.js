var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};
var dataDirectoryForm;
var organizationId = Fliplet.Env.get('organizationId');
var ignoreDataSourceTypes = ['menu'];

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

Fliplet.DataSources.get({ organizationId: organizationId })
  .then(function (dataSources) {
    var filteredDataSources = dataSources.filter(function (dataSource) {
      for (var i = 0; i < ignoreDataSourceTypes.length; i++) {
        if (ignoreDataSourceTypes[i] === dataSource.type) {
          return false;
        }
      }

      return true;
    });

    if (!filteredDataSources.length) {
      $('.no-data-source-prompt').show();
    }

    data.dataSources = filteredDataSources;
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
