var data = Fliplet.Widget.getData();

var rowTpl = Handlebars.compile($('#row').html());
var source;

if (!data) {
  render([{id: 1, name: 'Sample'}]);
} else {
  connect();
}

function connect() {
  Fliplet.DataSources.connect(data.dataSourceId).then(function (connection) {
    source = connection;
    return source.find();
  }).then(function (rows) {
    render(rows);
  })
}

function render(rows) {
  rows.forEach(function (row) {
    $('#output').append(rowTpl(row));
  })
}

$('body').on('click', '.item', function (event) {
  console.log($(this).html())

  if (!data) {
    // compileRow(sampleData here)
    return;
  }

  source.findById($(this).data('id')).then(function (row) {
    console.log('found', row)
    // compileRow with real data
  })
});