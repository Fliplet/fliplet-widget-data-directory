var dataDirectory = {};
$('[data-directory-id]').each(function(){
  var container = this;
  var id = $(this).data('directory-id');
  var config = Fliplet.Widget.getData(id);
  if (config.source) {
    if (!config.enable_live_data) {
      return dataDirectory[id] = new DataDirectory(config, container);
    }

    Fliplet.Storage.get('data-directory-rows-' + id)
      .then(function (rows) {
        if (rows) {
          config.rows = rows;
          dataDirectory[id] = new DataDirectory(config, container);
        } else {
          dataDirectory[id] = new DataDirectory(config, container);
        }

        if (Fliplet.Navigator.isOnline()) {
          Fliplet.DataSources.connect(config.source)
            .then(function (source) {
              return source.find();
            })
            .then(function (rows) {
              dataDirectory[id].data = rows.map(function (row) {
                row.data.dataSourceEntryId = row.id;
                return row.data;
              });

              Fliplet.Storage.set('data-directory-rows-' + id, config.rows);
              dataDirectory[id].init();
            });
        }
      });
  }
});
