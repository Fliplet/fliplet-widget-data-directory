var data = Fliplet.Widget.getData() || {};
var widgetId = Fliplet.Widget.getDefaultId();


data.dataSources = [{id: 1, name: 'A data source', columns: ['city', 'age']}];
var dataDirectoryForm = new DataDirectoryForm(data);

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  dataDirectoryForm.saveDataDirectoryForm_();
  Fliplet.Widget.save(dataDirectoryForm.directoryConfig).then(function () {
    Fliplet.Widget.complete();
  });
});
