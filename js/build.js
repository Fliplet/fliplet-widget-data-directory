var dataDirectory = {};
$('[data-directory-id]').each(function(){
  var container = this;
  var id = $(this).data('directory-id');
  var uuid = $(this).data('directory-uuid');
  var pvKey = 'data-directory-rows-' + uuid;
  var config = Fliplet.Widget.getData(id);
  if (config.source) {
    if (!config.enable_live_data) {
      return dataDirectory[id] = new DataDirectory(config, container);
    }

    Fliplet.Storage.get(pvKey)
      .then(function (rows) {
        if (rows) {
          config.rows = rows;
          dataDirectory[id] = new DataDirectory(config, container);
        } else {
          Fliplet.Storage.set(pvKey, config.rows);
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

              Fliplet.Storage.set(pvKey, dataDirectory[id].data);
              dataDirectory[id].init();
            });
        }
      });
  }
});
