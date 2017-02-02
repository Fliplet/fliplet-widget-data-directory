var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};
var dataDirectoryForm;
var organizationId = Fliplet.Env.get('organizationId');
var ignoreDataSourceTypes = ['menu'];

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
  dataDirectoryForm.saveDataDirectoryForm_();
  Fliplet.Widget.save(dataDirectoryForm.directoryConfig).then(function () {
    Fliplet.Studio.emit('reload-page-preview');
    Fliplet.Widget.complete();
  });
});
