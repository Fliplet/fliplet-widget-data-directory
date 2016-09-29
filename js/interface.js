var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData(widgetId) || {};

var dataDirectoryForm;

Fliplet.DataSources.get()
  .then(function (dataSources) {
    return Promise.all(dataSources.map(function (dataSource) {
      return Fliplet.DataSources.connect(dataSource.id)
        .then(function (source) {
          return source.find();
        })
        .then(function (rows) {
          dataSource.rows = rows.map(function (row) {
            return row.data;
          });
          return Promise.resolve(dataSource);
        });
    }))
      .then(function (dataSources) {
        data.dataSources = dataSources;
        dataDirectoryForm = new DataDirectoryForm(data);
      });
  });


// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  dataDirectoryForm.saveDataDirectoryForm_();
  Fliplet.Widget.save(dataDirectoryForm.directoryConfig).then(function () {
    Fliplet.Widget.complete();
  });
});
