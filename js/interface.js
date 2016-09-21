var data = Fliplet.Widget.getData();

$('form').submit(function (event) {
  event.preventDefault();

  Fliplet.Widget.save({
    dataSourceId: $('select').val()
  }).then(function () {
    Fliplet.Widget.complete();
  });
});

// Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  $('form').submit();
});

Fliplet.DataSources.get().then(function (datasources) {
  console.log('datasources', datasources)

  datasources.forEach(function (d) {
    $('select').append('<option value="' + d.id + '">' + d.name + '</option>')
  });

  if (data) {
    $('select').val(data.dataSourceId);
  }
  //todo: append to select
})