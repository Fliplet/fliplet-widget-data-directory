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
    return Promise.all(filteredDataSources.map(function (dataSource) {
      return Fliplet.DataSources.connect(dataSource.id)
        .then(function (source) {
          return source.find();
        })
        .then(function (rows) {
          dataSource.rows = rows.map(function (row) {
            row.data.dataSourceEntryId = row.id;
            return row.data;
          });
          return Promise.resolve(dataSource);
        });
    }))
      .then(function (dataSources) {
        if (!dataSources.length) {
          $('.no-data-source-prompt').show();
        }
        data.dataSources = dataSources;
        dataDirectoryForm = new DataDirectoryForm(data);
      });
  });

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  dataDirectoryForm.saveDataDirectoryForm_();
  Fliplet.Widget.save(dataDirectoryForm.directoryConfig).then(function () {
    Fliplet.Studio.emit('reload-page-preview');
    Fliplet.Widget.complete();
  });
});
