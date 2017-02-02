var dataDirectory = {};
$('[data-directory-id]').each(function(){
  var container = this;
  var id = $(this).data('directory-id');
  var uuid = $(this).data('directory-uuid');
  var pvKey = 'data-directory-rows-' + uuid;
  var config = Fliplet.Widget.getData(id);

  /*
   * Get data source data and format it to data directory format
   */
  function getData (options) {
    options = options || { offline: true };
    return Fliplet.DataSources.connect(config.source, options)
      .then(function (source) {
        return source.find();
      })
      .then(function formatData(rows) {
        var formattedRows = rows.map(function (row) {
          row.data.dataSourceEntryId = row.id;
          return row.data;
        });

        return Promise.resolve(formattedRows);
      })
      .catch(function(error) {
        console.log(error);
      });
  }

  if (!config.source) {
    return dataDirectory[id] = new DataDirectory(config, container);
  }
  
  if (!config.enable_live_data || Fliplet.Env.get('platform') === 'web') {
    return getData({ offline: true })
      .then(function (data) {
        config.rows = data;
        return dataDirectory[id] = new DataDirectory(config, container);
      });
  }

  Fliplet.Storage.get(pvKey)
    .then(function (rows) {
      if (rows) {
        Fliplet.Storage.set(pvKey, config.rows);
        config.rows = rows;
        dataDirectory[id] = new DataDirectory(config, container);
      }

      if (Fliplet.Navigator.isOnline()) {
        return getData({ offline: false })
          .then(function (data) {
            config.rows = data;
            Fliplet.Storage.set(pvKey, data);
            return dataDirectory[id] = new DataDirectory(config, container);
          });
      }

      return Promise.reject();
    })
    .catch(function () {
      // Start data directory with no data
      dataDirectory[id] = new DataDirectory(config, container);
    });
});
